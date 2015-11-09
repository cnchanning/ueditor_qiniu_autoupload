/*global UEditor or UMEditor ,mOxie*/

;(function(editor){
	
	editor.plugins['qiniu_autoupload'] = function () {

    var me = this;
    if(me.plugins['autoupload']){
        throw new Error('请删除自带的autoload插件');
    }

    me.setOpt('pasteImageEnabled', true);
    me.setOpt('dropFileEnabled', true);
    var sendAndInsertImage = function (file, editor) {
        //模拟数据
        var fd = new FormData();
        fd.append('file', file, file.name || ('filename.' + file.type.substr('image/'.length)));
        fd.append('type', 'ajax');

        var ajax = new XMLHttpRequest();
        ajax.open('GET', editor.options.tokenUrl, true);
        ajax.setRequestHeader("If-Modified-Since", "0");
        ajax.onreadystatechange = function() {
            if (ajax.readyState === 4 && ajax.status === 200) {
                var res = JSON.parse(ajax.responseText);
                var token = res.uptoken;
                fd.append('token', token);
                fd.append('key', editor.options.qiniuPrefixPath+ new Date().valueOf()+'_'+ (file.name || Math.floor(Math.random()*10000) + '.' + file.type.substr('image/'.length)));
                var xhr = new XMLHttpRequest();
                xhr.open("post", editor.options.qiniuUploadUrl, true);
                xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                xhr.addEventListener('load', function (e) {
                    try {
                        var json = eval('('+e.target.response+')'),
                            link = json.key,
                            picLink = editor.options.qiniuCDN + link;
                        editor.execCommand('insertimage', {
                            src: picLink,
                            _src: picLink
                        });
                    } catch (er) {
                    }
                });
                xhr.send(fd);
            }
        };
        ajax.send();
    };

    function getPasteImage(e) {
        return e.clipboardData && e.clipboardData.items && e.clipboardData.items.length == 1 && /^image\//.test(e.clipboardData.items[0].type) ? e.clipboardData.items : null;
    }

    function getDropImage(e) {
        return  e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : null;
    }

    me.addListener('ready', function () {
        if (window.FormData && window.FileReader) {
            var autoUploadHandler = function (e) {
                var hasImg = false,
                    items;
                //获取粘贴板文件列表或者拖放文件列表
                items = e.type == 'paste' ? getPasteImage(e.originalEvent) : getDropImage(e.originalEvent);
                if (items) {
                    var len = items.length,
                        file;
                    while (len--) {
                        file = items[len];
                        if (file.getAsFile) file = file.getAsFile();
                        if (file && file.size > 0 && /image\/\w+/i.test(file.type)) {
                            sendAndInsertImage(file, me);
                            hasImg = true;
                        }
                    }
                    if (hasImg) return false;
                }

            };
            me.getOpt('pasteImageEnabled') && me.$body.on('paste', autoUploadHandler);
            me.getOpt('dropFileEnabled') && me.$body.on('drop', autoUploadHandler);

            //取消拖放图片时出现的文字光标位置提示
            me.$body.on('dragover', function (e) {
                if (e.originalEvent.dataTransfer.types[0] == 'Files') {
                    return false;
                }
            });
        }
    });
	
};
})(window.UE||window.UM)