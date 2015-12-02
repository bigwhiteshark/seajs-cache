/*
 * seajs-cache,support cache js and template file.
 * auth:bigwhiteshark
 * email:yangxinming@outlook.com
 *
 */
(function(global) {
    var storage = global.localStorage;
    if (storage) {
        var storagePrefix = 'cache~';
        var defaultExpiration = 5000 * 60 * 60 * 1000; //ms unit
        var exec = seajs.Module.prototype.exec;
        var slice = Array.prototype.slice;

        function wrapData(obj) {
            var now = +new Date();
            obj.stamp = now;
            obj.expire = now + (obj.expire || defaultExpiration);
            return obj;
        }
        var cache = {
            set: function(key, storeObj) {
                try {
                    storage.setItem(key, JSON.stringify(storeObj));
                    return true;
                } catch (e) {
                    //sometimes setItem will appear QUOTA_EXCEEDED_ERR errors,
                    //then the general before setItem first removeItem to ok
                    if (e.name.toUpperCase().indexOf('QUOTA') >= 0) {
                        var item, tempScripts = [];
                        for (item in storage) {
                            if (item.indexOf(storagePrefix) === 0) {
                                tempScripts.push(JSON.parse(storage[item]));
                            }
                        }
                        if (tempScripts.length) {
                            tempScripts.sort(function(a, b) {
                                return a.stamp - b.stamp;
                            });
                            cache.remove(tempScripts[0].key);
                            return cache.set(key, storeObj);
                        } else { // no files to remove. Larger than available quota
                            return;
                        }
                    } else { // some other error
                        return;
                    }
                }
            },

            remove: function(key) {
                try {
                    storage.removeItem(key);
                } catch (e) {}
                return this;
            },

            get: function(key) {
                try {
                    var item = storage.getItem(key);
                    return JSON.parse(item || 'false');
                } catch (e) {
                    return false;
                }
            },

            clear: function(expired) {
                var key,
                    now = +new Date();
                for (key in storage) {
                    if (key && (!expired || this.get(key).expire <= now)) {
                        try {
                            this.remove(key);
                        } catch (e) {}
                    }
                }
                return this;
            }
        };

        cache.clear(true); //delete expired item

        function isSupportFile(url) {
            //supported cache files.
            var cacheFiles = seajs.data.cacheFiles || ['.js', '.html', '.json', '.handlebars'];
            var cacheReg = new RegExp('\\' + cacheFiles.join('|') + '(?:\\?|$)', 'i');
            return cacheReg.test(url);
        }

        function parseUrl(url) {
            var urlReg = /^((\w+):\/\/)?((\w+):?(\w+)?@)?([^\/\?:]+):?(\d+)?(\/?[^\?#]+)?\??([^#]+)?#?(\w*)/,
                fields = urlReg.exec(url),
                version = /v=.*/.exec(fields[9]);
            version = version ? version[0].split('=')[1] : 1;
            return [fields[8], version];
        }

        function getCacheInfo(uri) {
            var uriVersion = parseUrl(uri);
            return {
                cacheKey: uriVersion[0],
                cacheVersion: cache.get(storagePrefix + 'version') || {},
                remoteVersion: uriVersion[1]
            }
        }

        function globalEval(content) {
            if (content && /\S/.test(content)) {
                (global.execScript || function(content) {
                    (global.eval || eval).call(global, content)
                })(content)
            }
        }

        seajs.on('config', function(opts) {
            if (seajs.data.debug) return;
            var cacheVersion = seajs.data.cacheVersion || 0,
                defaultExpiration = seajs.data.expiration || defaultExpiration;
            var key = storagePrefix + 'version';
            storeData = cache.get(key);
            var localVersion = storeData ? storeData.version : 0;
            if (localVersion < cacheVersion) {
                cache.clear();
                storeData = wrapData({
                    version: cacheVersion
                });
                cache.set(key, storeData);
            }
            for (k in storage) {
                if (k !== key && !isSupportFile(k)) {
                    cache.remove(k);
                }
            }
        });

        /*seajs.on('exec', function(mod) {
            var uri = mod.uri;
            if(uri.indexOf('.html')>-1){
                console.log(mod)
                debugger;
            }
         })*/

        /*seajs.on('save', function(mod) {
            var uri = mod.uri;
            if (seajs.data.debug || !isSupportFile(uri)) return;
            var cacheKey = parseUrl(uri)[0];
            var key = storagePrefix + cacheKey;
            var f = mod.factory;
            if(uri.indexOf('.html')>-1){
                console.log(mod)
                debugger;
            }
            f = typeof(f) === 'function' ? f + '' : JSON.stringify(f);
            var code = 'define("' + mod.id + '", ["' + mod.dependencies.join('","') + '"], ' + f + ');'
            var storeData = {
                code: code
            };
            storeData = wrapData(storeData);
            cache.set(key, storeData);
        })*/

        seajs.Module.prototype.exec = function() {
            var uri = this.uri;
            if (uri && this.factory && !seajs.data.debug && isSupportFile(uri)) {
                var cacheKey = parseUrl(this.uri)[0];
                var key = storagePrefix + cacheKey;
                var f = this.factory;
                f = typeof(f) === 'function' ? f + '' : JSON.stringify(f);
                var code = 'define("' + this.id + '", ["' + this.dependencies.join('","') + '"], ' + f + ');'
                var storeData = {
                    code: code
                };
                var localCache = seajs.getLocalCache(uri);
                if(!localCache.code){
                    storeData = wrapData(storeData);
                    cache.set(key, storeData);
                    var cacheKey = localCache.key;
                    var remoteVersion = localCache.remoteVersion;
                    var cacheVersion = localCache.cacheVersion;
                    cacheVersion[cacheKey] = remoteVersion;
                    cache.set(storagePrefix + 'version', cacheVersion);
                }

            }
            return exec.apply(this, slice.call(arguments));
        };

        seajs.getLocalCache = function(uri) {
            var cacheInfo = getCacheInfo(uri);
            var cacheKey = cacheInfo.cacheKey;
            var remoteVersion = cacheInfo.remoteVersion;
            var cacheVersion = cacheInfo.cacheVersion;

            var storeData = cache.get(storagePrefix + cacheKey);
            var code;
            if (storeData && remoteVersion === cacheVersion[cacheKey]) {
                code = storeData.code;
            }
            return {
                code:code,
                key:cacheKey,
                remoteVersion:remoteVersion,
                cacheVersion:cacheVersion
            }
        }

        seajs.on("request", function(data) {
            var uri = data.requestUri;
            if (seajs.data.debug || !isSupportFile(uri)) return;
            var localCode = seajs.getLocalCache(uri).code;
            if (localCode) {
                globalEval(localCode);
                data.requested = true;
                data.onRequest();
            }
        })
    }

})(this);