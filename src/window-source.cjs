function windowHandle(value) {
  try {
    const handle=BigInt(value);
    return (handle<0n?BigInt.asUintN(32,handle):handle).toString();
  } catch { return ''; }
}
function findWindowSource(sources,handle) {
  const wanted=windowHandle(handle);if(!wanted||wanted==='0')return undefined;
  return sources.find(source=>{const match=/^window:([^:]+):/.exec(source.id);return match&&windowHandle(match[1])===wanted;});
}
module.exports={windowHandle,findWindowSource};
