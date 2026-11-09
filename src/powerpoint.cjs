const { execFile, spawn } = require('node:child_process');
const path = require('node:path');
const readline = require('node:readline');
const nativeDirectory = path.join(__dirname, 'native').replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
class PowerPoint {
  constructor() { this.pending = new Map(); this.counter = 0; this.queue = Promise.resolve(); }
  diagnostics() { return this.lastFailure||null; }
  warmup() { if (process.platform === 'win32' && !this.child) this.startWindows(); }
  execute(operation, file = '', output = '', options = {}) {
    const next = this.queue.then(async () => {
      if (operation === 'start' && process.platform === 'darwin') {
        const prepared = await this.run('prepare', file, output, options);
        if (options.control && options.audienceIndex) await this.run('configure', file, output, {...options, wasSaved:prepared.wasSaved});
      }
      const result = await this.run(operation, file, output, options);
      return result;
    });
    this.queue = next.catch(() => {});
    return next;
  }
  run(operation, file, output, options) {
    if (process.platform === 'darwin') return new Promise((resolve, reject) => {
      const args = [path.join(nativeDirectory, 'powerpoint.applescript'), operation, file, options.showPresenter === false ? 'false' : 'true'];
      if (operation === 'start') args.splice(0, args.length, path.join(nativeDirectory, 'launch.applescript'), path.basename(file), options.showPresenter === false ? 'false' : 'true');
      if (operation === 'layout') args.splice(0, args.length, path.join(nativeDirectory, 'layout.applescript'), path.basename(file, path.extname(file)));
      if (operation === 'place-sources') args.splice(0,args.length,path.join(nativeDirectory,'place-sources.applescript'),path.basename(file,path.extname(file)),...options.positions.map(String));
      if (operation === 'route-roles') args.splice(0,args.length,path.join(nativeDirectory,'route-roles.applescript'),path.basename(file,path.extname(file)),options.hideSlides ? 'true':'false',options.hideNotes ? 'true':'false');
      if (operation === 'configure') args.splice(0, args.length, path.join(nativeDirectory, 'configure.applescript'), path.basename(file, path.extname(file)), String(options.control.x), String(options.control.y), String(options.audienceIndex), options.wasSaved ? 'true' : 'false');
      execFile('/usr/bin/osascript', args, { timeout: ['start','prepare','thumbnail'].includes(operation) ? 60000 : operation === 'configure' ? 20000 : 10000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          if(error.killed||error.code==='ETIMEDOUT')return reject(Error('PowerPoint nije završio učitavanje na vreme. Proveri otvorene dijaloge u PowerPointu, pa ponovi GO.'));
          const permission = /1743|not authorized|not permitted/i.test(stderr);
          const accessibility = /1002|10004|assistive|keystroke|accessibility/i.test(stderr);
          return reject(Error(accessibility ? 'Dozvoli StageDeck u System Settings → Privacy & Security → Accessibility da pokrene PowerPoint Presenter View.' : permission ? 'Dozvoli da StageDeck kontroliše PowerPoint i System Events u System Settings → Privacy & Security → Automation.' : (stderr.trim() || error.message)));
        }
        try { resolve(JSON.parse(stdout)); } catch { reject(Error('Neočekivan odgovor PowerPointa.')); }
      });
    });
    if (process.platform !== 'win32') return Promise.reject(Error('PowerPoint integracija podržava Windows i macOS.'));
    if (!this.child) this.startWindows();
    return new Promise((resolve, reject) => {
      const id = ++this.counter;
      const timer = setTimeout(() => {
        this.pending.delete(id); this.child?.kill(); this.child = null;
        const message='PowerPoint nije odgovorio na vreme ('+operation+').';this.lastFailure={operation,stage:'timeout',message};reject(Error(message));
      }, ['start','thumbnail'].includes(operation) ? 60000 : 12000);
      this.pending.set(id, { resolve, reject, timer, operation });
      this.child.stdin.write(JSON.stringify({ id, operation, path: file, output, options }) + '\n');
    });
  }
  startWindows() {
    this.child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', path.join(nativeDirectory, 'powerpoint.ps1')], { windowsHide: true, stdio: ['pipe','pipe','pipe'] });
    const child = this.child;
    readline.createInterface({ input: child.stdout }).on('line', line => {
      if (this.child !== child) return;
      try {
        const message = JSON.parse(line), p = this.pending.get(message.id);
        if (!p) return;
        clearTimeout(p.timer); this.pending.delete(message.id);
        if(message.error){this.lastFailure={operation:p.operation,...message.diagnostics,message:message.error};p.reject(Error(message.error));}
        else p.resolve(message.result);
      } catch { /* PowerShell startup messages are not protocol replies. */ }
    });
    const failed = error => {
      if (this.child !== child) return;
      const message=error?.message||('PowerPoint Windows veza je prekinuta.'+(stderr?' '+stderr.trim().slice(-1000):''));
      this.lastFailure={stage:'windows-worker',message};
      for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(Error(message)); }
      this.pending.clear(); this.child = null;
    };
    child.on('error', failed); child.on('exit', () => failed());
    child.stdin.on('error', failed);
    let stderr='';child.stderr.on('data', chunk => {stderr=(stderr+chunk).slice(-2000);});
  }
  dispose() { this.child?.kill(); }
}
module.exports = { PowerPoint };
