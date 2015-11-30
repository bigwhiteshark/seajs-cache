## 使用方法

    seajs.config({
        base: "./",
        cacheVersion:1,  //缓存版本号
        debug:true //禁用缓存，默认不禁用
    });

## 单独文件缓存

 针对 http://path/to/c.js?v=xxx 单个文件版本做缓存，为每个文件添加版本号?v=xxxx;
 可使用seajs.config(map:map)做个版本映射,如下

    var _cache_versions[js][ http://path/to/c] = '20151126'; //
    //........
    var _cache_versions[tpl][ http://path/to/tpl] = '20151122';//存放各个文件的版本号

    var map = [];
   
    map.push([/^(.*\.(?:(js|css|json|tpl)))(.*)$/i, function (file) {
        if (typeof SO_PRODUCTION != 'undefined' && SO_PRODUCTION) {
            var type = file.match(/\.([a-zA-H]*)$/);
            if(type){
                var mod = file.replace(/^.*?((js|css|json|tpl)\/)$/, '').replace(/\.js|\.css|\.json|\.tpl/, '');
                var version = "20151126";
               /* if (_so_versions[type][mod]) {
                    file += '?v=' + _so_versions[type][mod];
                }*/
             
                var reg = new RegExp('\\?v='+version);
                if(!reg.exec(file)){
                    file += '?v='+version;
                }
            }
        }

        return file;
    }]);

    seajs.config({
        map: map
    });
