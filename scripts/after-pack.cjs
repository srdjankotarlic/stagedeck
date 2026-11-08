const fs=require('node:fs');const path=require('node:path');
module.exports=async context=>{
 if(context.electronPlatformName!=='win32')return;
 const PE=await import('pe-library'),ResEdit=await import('resedit');
 const target=path.join(context.appOutDir,'StageDeck.exe');
 const exe=PE.NtExecutable.from(fs.readFileSync(target),{ignoreCert:true}),resource=PE.NtExecutableResource.from(exe);
 const icon=ResEdit.Data.IconFile.from(fs.readFileSync(path.join(context.packager.projectDir,'assets/icon.ico')));
 for(const group of ResEdit.Resource.IconGroupEntry.fromEntries(resource.entries))ResEdit.Resource.IconGroupEntry.replaceIconsForResource(resource.entries,group.id,group.lang,icon.icons.map(i=>i.data));
 const vi=ResEdit.Resource.VersionInfo.fromEntries(resource.entries)[0];
 if(vi){const version=context.packager.appInfo.version.split('.').map(Number);vi.setFileVersion(...version,0,1033);vi.setProductVersion(...version,0,1033);vi.setStringValues({lang:1033,codepage:1200},{FileDescription:'StageDeck',ProductName:'StageDeck',CompanyName:'StageDeck',OriginalFilename:'StageDeck.exe',InternalName:'StageDeck'});vi.outputToResourceEntries(resource.entries);}
 resource.outputResource(exe);fs.writeFileSync(target,Buffer.from(exe.generate()));
};
