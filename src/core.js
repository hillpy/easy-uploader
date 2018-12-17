import defaultOptions from './defaultoptions'   // 导入默认选项
import common from './common'   // 导入通用静态函数类

if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
        value: function(callback, type, quality) {
            var binStr = atob(this.toDataURL(type, quality).split(",")[1]),
                len = binStr.length,
                arr = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
                arr[i] = binStr.charCodeAt(i);
            }
            callback(new Blob([arr], { type: type || "image/png" }));
        }
    });
}

export default class easyUploader {
    /**
     * 初始化构造函数
     * @param {*} options 
     */
    constructor(options = {}) {
        if (!(this instanceof easyUploader)) {
            return new easyUploader(options);
        }

        // 公共参数
        this.fileObj = "";
        this.elObj = "";
        this.fileType = "";
        this.fileName = "";
        this.fileSize = "";
        this.fileExt = "";
        this.fileObjClickStatus = true;
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d");
        this.formData = new FormData();
        this.eval = eval;

        // 扩展配置选项
        this.options = common.extend(defaultOptions, options);

        // 初始化
        this.init();
    }

    /**
     * 初始化
     */
    init() {
        if (this.options.el) {
            this.elObj = document.querySelector(this.options.el);
            this.createInput();
            this.bindElToInput();
            this.options.allowDrag && this.listenDrag(this.elObj);
        } else {
            this.fileObj = document.querySelector(this.options.file);
            this.options.allowDrag && this.listenDrag(this.fileObj);
        }

        this.listenFileObjClick();
        this.listenFileObjChange();
    }

    /**
     * 创建input(type=file)
     */
    createInput() {
        this.options.id || (this.options.id = "easyuploader_" + common.getNonce());
        var input = document.createElement("input");
        input.type = "file";
        input.name = this.options.name;
        input.id = this.options.id;
        input.accept = this.options.accept;
        input.setAttribute("style", "display: none; !important");
        document.querySelector("body").appendChild(input);
        this.fileObj = document.querySelector("#" + this.options.id);
    }

    /**
     * 元素点击事件绑定到文件对象点击事件
     */
    bindElToInput() {
        var _this = this;
        _this.elObj.addEventListener("click", function() {
            _this.fileObj.click();
        });
    }

    /**
     * 启用点击
     */
    enableFileObjClick() {
        this.fileObjClickStatus = true;
    }

    /**
     * 禁用点击
     */
    disableFileObjClick() {
        this.fileObjClickStatus = false;
    }

    /**
     * 监听文件对象点击
     */
    listenFileObjClick() {
        var _this = this;
        _this.fileObj.addEventListener("click", function(e) {
            _this.fileObjClickStatus || e.preventDefault();
        });
    }

    /**
     * 监听文件对象值变化
     */
    listenFileObjChange() {
        var _this = this;
        _this.fileObj.addEventListener("change", function() {
            _this.fileType = _this.fileObj.files[0].type;
            _this.fileName = _this.fileObj.files[0].name;
            _this.fileExt = _this.fileName.split(".").pop();
            _this.fileSize = _this.fileObj.files[0].size;
            if (_this.checkFile()) {
                if (_this.fileType.indexOf("image/") >= 0 && _this.options.compress) {
                    _this.drawAndRenderCanvas();
                } else {
                    _this.options.autoUpload && _this.uploadFile(_this.fileObj.files[0]);
                }
            }
        });
    }

    /**
     * 监听拖曳事件
     */
    listenDrag(obj) {
        var _this = this;
        obj.addEventListener("drop", function(e) {
            e.preventDefault();
            _this.options.onDrop && _this.options.onDrop(e);
            _this.fileObj.files = e.dataTransfer.files;
        });
        obj.addEventListener("dragover", function(e) {
            e.preventDefault();
            _this.options.onDragOver && _this.options.onDragOver(e);
        });
        obj.addEventListener("dragenter", function(e) {
            e.preventDefault();
            _this.options.onDragEnter && _this.options.onDragEnter(e);
        });
        obj.addEventListener("dragleave", function(e) {
            e.preventDefault();
            _this.options.onDragLeave && _this.options.onDragLeave(e);
        });
    }

    /**
     * 重绘image并渲染画布
     */
    drawAndRenderCanvas() {
        var _this = this,
            reader = new FileReader,
            image = new Image(),
            arrayBuffer = new ArrayBuffer(),
            orientation = 1,
            width = '',
            height = '';

        reader.readAsDataURL(_this.fileObj.files[0]);
        reader.onload = function(e) {
            arrayBuffer = common.base64ToArrayBuffer(this.result);
            orientation = common.getOrientation(arrayBuffer);
            image.src = this.result;
        }

        image.onload = function() {
            if (_this.options.compress) {
                if (image.width > _this.options.resize.maxWidth || image.height > _this.options.resize.maxHeight) {
                    if (image.width > image.height) {
                        width = _this.options.resize.maxWidth;
                        height = (image.height / image.width) * _this.options.resize.maxWidth;
                    } else {
                        width = (image.width / image.height) * _this.options.resize.maxHeight;
                        height = _this.options.resize.maxHeight;
                    }
                } else {
                    width = image.width;
                    height = image.height;
                }
            } else {
                width = image.width;
                height = image.height;
                _this.options.compressQuality = 1;
            }

            if (_this.options.fixOrientation) {
                switch(orientation) {
                    // 偏移180度
                    case 3:
                        _this.canvas.width = width;
                        _this.canvas.height = height;
                        _this.context.rotate(180 * Math.PI / 180);
                        _this.context.drawImage(image, -width, -height, width, height);
                        break;
                    
                    // 顺时针偏移90度
                    case 6:
                        _this.canvas.width = height;
                        _this.canvas.height = width;
                        _this.context.rotate(90 * Math.PI / 180);
                        _this.context.drawImage(image, 0, -height, width, height);
                        break;
                    
                    // 顺时针偏移270度
                    case 8:
                        _this.canvas.width = height;
                        _this.canvas.height = width;
                        _this.context.rotate(270 * Math.PI / 180);
                        _this.context.drawImage(image, -width, 0, width, height);
                        break;
                    
                    // 0度和默认，不旋转
                    case 1:
                    default:
                        _this.canvas.width = width;
                        _this.canvas.height = height;
                        _this.context.drawImage(image, 0, 0, width, height);
                }
            } else {
                _this.canvas.width = width;
                _this.canvas.height = height;
                _this.context.drawImage(image, 0, 0, width, height);
            }

            _this.canvas.setAttribute("style", "display: none !important;");
            document.querySelector("body").appendChild(_this.canvas);
            _this.options.autoUpload && _this.uploadCanvas();
        }
    }

    /**
     * 上传函数
     */
    upload() {
        if (this.fileType.indexOf("image/") >= 0) {
            this.uploadCanvas();
        } else {
            this.uploadFile(this.fileObj.files[0]);
        }
    }

    /**
     * 上传canvas中的图片文件
     */
    uploadCanvas() {
        var _this = this;

        if (!_this.fileObj.files[0]) {
            _this.renderTipDom("请先选择文件")
            return;
        }

        _this.canvas.toBlob(function(blob) {
            _this.uploadFile(blob);
        }, _this.fileType, _this.options.compressQuality);
    }

    /**
     * 上传文件
     */
    uploadFile(value) {
        var _this = this;

        if (!_this.fileObj.files[0]) {
            _this.renderTipDom("请先选择文件");
            return;
        }

        _this.formData.append(_this.options.name, value, _this.fileName);
        var xhr = new XMLHttpRequest();
        xhr.open(_this.options.method, _this.options.url, true);
        xhr.upload.addEventListener("progress", function(e) {
            _this.options.onUploadProgress && _this.options.onUploadProgress(e);
        });
        xhr.upload.addEventListener("loadstart", function(e) {
            _this.options.onUploadStart && _this.options.onUploadStart(e);
        });
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
                    _this.options.onUploadComplete && _this.options.onUploadComplete(_this.handleRes(xhr.responseText));
                } else {
                    _this.options.onUploadError && _this.options.onUploadError(xhr.status);
                }
                _this.fileObj.value = "";
            }
        };
        //xhr.setRequestHeader("Content-type", "multipart/form-data");
        xhr.send(_this.formData);
    }

    /**
     * 渲染提示层到dom
     */
    renderTipDom(text) {
        var div = document.createElement("div");
        div.innerHTML = text;
        if (this.options.tipClass) {
            div.className = this.options.tipClass;
        } else {
            div.setAttribute("style", "max-width: 80%;padding: 16px 20px;font-size: 14px;color: #fff;box-sizing: border-box;border-radius: 2px;filter: Alpha(opacity=80);opacity: 0.8;-moz-opacity: 0.8;user-select: none;position: absolute;top: 50%;left: 50%;z-index: 100000;transform: translate(-50%, -50%);-webkit-transform: translate(-50%, -50%);text-align: center;background: #000;overflow: hidden;white-space: nowrap;text-overflow: ellipsis;");
        }
        document.querySelector("body").appendChild(div);
        setTimeout(function() {
            var opacity = div.style.opacity;
            if (opacity > 0) {
                opacity = (opacity - 0.2).toFixed(1)
                if (opacity < 0) {
                    opacity = 0;
                }
                var hideTip = setInterval(function() {
                    div.style.opacity = opacity;
                    div.style.filter = "Alpha((opacity = " + opacity * 100 + "))";
                    if (opacity <= 0) {
                        div.remove();
                        clearInterval(hideTip);
                    } else {
                        opacity = (opacity - 0.1).toFixed(1);
                        if (opacity < 0) {
                            opacity = 0;
                        }
                    }
                }, 10);
            } else {
                div.remove()
            }
        }, 1500);
    }

    /**
     * 校验文件（尺寸、类型）
     */
    checkFile() {
        var maxFileSize = this.options.maxFileSize,
            maxFileSizeWithLetter = 0,
            letterStr = "";
        if (maxFileSize.indexOf("B") > 0) {
            maxFileSize = maxFileSize.replace(/B/g, "");
            letterStr = "B";
        }
        if (maxFileSize.indexOf("K") > 0) {
            maxFileSizeWithLetter = this.eval(maxFileSize.replace(/K/g, ""));
            maxFileSize = maxFileSizeWithLetter * 1024;
            letterStr = "K" + letterStr;
        } else if (maxFileSize.indexOf("M") > 0) {
            maxFileSizeWithLetter = this.eval(maxFileSize.replace(/M/g, ""));
            maxFileSize = maxFileSizeWithLetter * 1024 * 1024;
            letterStr = "M" + letterStr;
        } else if (maxFileSize.indexOf("G") > 0) {
            maxFileSizeWithLetter = this.eval(maxFileSize.replace(/G/g, ""));
            maxFileSize = maxFileSizeWithLetter * 1024 * 1024 * 1024;
            letterStr = "G" + letterStr;
        } else if (maxFileSize.indexOf("T") > 0) {
            maxFileSizeWithLetter = this.eval(maxFileSize.replace(/T/g, ""));
            maxFileSize = maxFileSizeWithLetter * 1024 * 1024 * 1024 * 1024;
            letterStr = "T" + letterStr;
        } else if (maxFileSize.indexOf("P") > 0) {
            maxFileSizeWithLetter = this.eval(maxFileSize.replace(/P/g, ""));
            maxFileSize = maxFileSizeWithLetter * 1024 * 1024 * 1024 * 1024 * 1024;
            letterStr = "P" + letterStr;
        } else {
            maxFileSizeWithLetter = this.eval(maxFileSize);
            maxFileSize = maxFileSizeWithLetter;
            letterStr = "B";
        }

        if (this.fileSize > maxFileSize) {
            this.renderTipDom("文件太大，最大允许为" + maxFileSizeWithLetter + letterStr);
            this.fileObj.value = "";
            return false;
        }

        if (this.options.allowFileExt.length > 0 && this.options.allowFileExt.indexOf(this.fileExt) == -1) {
            this.renderTipDom("文件格式不允许上传，请上传" + this.options.allowFileExt.join("，") + "格式的文件");
            this.fileObj.value = "";
            return false;
        }

        return true;
    }

    /**
     * 处理结果格式
     */
    handleRes(res) {
        var resType = this.options.resType.toLowerCase();
        if (resType == "json") {
            return JSON.parse(res);
        } else if (resType == 'text') {
            return res;
        } else {
            return res;
        }
    }
}