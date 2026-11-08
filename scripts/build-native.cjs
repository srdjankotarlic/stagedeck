const {execFileSync}=require('node:child_process');const path=require('node:path');const fs=require('node:fs');
if(process.platform==='darwin'){
 const root=path.join(__dirname,'..'),source=path.join(root,'src/native/displays.m');
 const output=path.join(root,'src/native/display-helper');const temporary=path.join(root,'.test-output/native');fs.mkdirSync(temporary,{recursive:true});
 for(const arch of ['arm64','x86_64'])execFileSync('xcrun',['clang','-O2','-fobjc-arc','-target',`${arch}-apple-macos12.0`,source,'-framework','Foundation','-framework','AppKit','-framework','CoreGraphics','-o',path.join(temporary,arch)],{stdio:'inherit'});
 execFileSync('lipo',['-create',path.join(temporary,'arm64'),path.join(temporary,'x86_64'),'-output',output]);fs.chmodSync(output,0o755);
 const capture=path.join(root,'src/native/window-capture.m'),captureOutput=path.join(root,'src/native/window-capture');
 for(const arch of ['arm64','x86_64'])execFileSync('xcrun',['clang','-O2','-fobjc-arc','-target',`${arch}-apple-macos13.0`,capture,'-framework','AppKit','-framework','Foundation','-framework','ScreenCaptureKit','-framework','CoreGraphics','-framework','CoreVideo','-framework','CoreMedia','-framework','CoreImage','-framework','ImageIO','-framework','UniformTypeIdentifiers','-o',path.join(temporary,`capture-${arch}`)],{stdio:'inherit'});
 execFileSync('lipo',['-create',path.join(temporary,'capture-arm64'),path.join(temporary,'capture-x86_64'),'-output',captureOutput]);fs.chmodSync(captureOutput,0o755);
}
