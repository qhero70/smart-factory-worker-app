function testMasterCheck() {
  const makeName = function(codes) {
    return String.fromCharCode.apply(null, codes);
  };

  const patchName = makeName([35036,40778,48,52,24037,31449,38364,32879,35215,26684,95]);
  const replyName = makeName([29986,29983,20027,27284,27298,26597,22238,35206,25991,23383,95,118,51,95,48,95]);

  const patchFn = this[patchName] || (typeof globalThis !== 'undefined' ? globalThis[patchName] : null);
  if (typeof patchFn === 'function') {
    patchFn();
  }

  const replyFn = this[replyName] || (typeof globalThis !== 'undefined' ? globalThis[replyName] : null);
  if (typeof replyFn !== 'function') {
    return 'missing reply function';
  }

  const text = replyFn();
  Logger.log(text);
  return text;
}

function testLineMasterCheck() {
  return testMasterCheck();
}
