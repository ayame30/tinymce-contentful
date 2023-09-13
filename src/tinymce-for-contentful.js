window.contentfulExtension.init(function(api) {
  function tweak(param) {
    var t = param.trim();
    if (t === "false") {
      return false;
    } else if (t === "") {
      return undefined;
    } else {
      return t;
    }
  }

  var apiDomain = tweak(api.parameters.installation.apiDomain);
  var apiToken = tweak(api.parameters.installation.apiToken);

  const imageUploadHandler = (blobInfo, progress) => new Promise(async (resolve, reject) => {
    const blob = blobInfo.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    $.ajax({
      url: apiDomain + '/media/upload/' + blobInfo.filename(),
      headers: {
          'Authorization': 'Bearer ' + apiToken, 
      },
      type: "POST",
      data: buffer,
      processData: false
    }).then((res) => {
      console.log(res);
      resolve(res.url);
    }).catch((err) => {
      reject(err);
    });
  });

  function tinymceForContentful(api) {
    var p = tweak(api.parameters.instance.plugins);
    var tb = tweak(api.parameters.instance.toolbar);
    var mb = tweak(api.parameters.instance.menubar);  
    var imagetoolsCorsHosts = tweak(api.parameters.instance.imagetoolsCorsHosts);  

    api.window.startAutoResizer();

    tinymce.init({
      selector: "#editor",
      plugins: p,
      toolbar: tb,
      menubar: mb,
      min_height: 600,
      max_height: 1000,
      autoresize_bottom_margin: 15,
      resize: true,
      image_caption: true,
      imagetools_cors_hosts: imagetoolsCorsHosts.split(','),
      images_upload_handler: imageUploadHandler,
      init_instance_callback : function(editor) {
        var listening = true;

        function getEditorContent() {
          return editor.getContent() || '';
        }

        function getApiContent() {
          return api.field.getValue() || '';
        }

        function setContent(x) {
          var apiContent = x || '';
          var editorContent = getEditorContent();
          if (apiContent !== editorContent) {
            //console.log('Setting editor content to: [' + apiContent + ']');
            editor.setContent(apiContent);
          }
        }

        setContent(api.field.getValue());

        api.field.onValueChanged(function(x) {
          if (listening) {
            setContent(x);
          }
        });

        function onEditorChange() {
          var editorContent = getEditorContent();
          var apiContent = getApiContent();

          if (editorContent !== apiContent) {
            //console.log('Setting content in api to: [' + editorContent + ']');
            listening = false;
            api.field.setValue(editorContent).then(function() {
              listening = true;
            }).catch(function(err) {
              console.log("Error setting content", err);
              listening = true;
            });
          }
        }

        var throttled = _.throttle(onEditorChange, 500, {leading: true});
        editor.on('change keyup setcontent blur', throttled);
      }
    });
  }

  function loadScript(src, onload) {
    var script = document.createElement('script');
    script.setAttribute('src', src);
    script.onload = onload;
    document.body.appendChild(script);
  }

  var minSrcUrl = api.parameters.installation.minSrcUrl;
  loadScript(minSrcUrl, function() {
    tinymceForContentful(api);
  });
});
