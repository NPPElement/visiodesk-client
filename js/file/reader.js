/**
* File Api file reader
*/

function FileReaderHelper() {
  return {
    checkFileApiSupport: checkFileApiSupport,
    registerHandler: registerHandler
  };
  
  /** 
  * Check for the various File API support.
  * @returns {boolean} return File Api support flag
  */
  function checkFileApiSupport() {
    return window.File && window.FileReader && window.FileList && window.Blob || false;
  }
  
  /**
  * @param {string} selector
  * @return {Deferred} return deferred result
  */
  function registerHandler(selector) {
    let def = $.Deferred(); 
    
    $(selector).change((evt) => {
      let files = [];
      let pending = evt.target.files.length;
      
      _.each(evt.target.files, (file) => {
        let fileReader = new FileReader();
        fileReader.onload = () => {
          files.push(fileReader.result);
          --pending;
          if (!pending) {
            //read the last file, make some callback
            def.resolve(files);
          }
        };
        
        fileReader.readAsText(file);
      });
    });
    
    return def;
  }
}