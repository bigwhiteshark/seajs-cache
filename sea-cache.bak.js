/*
 * seajs-cache,support cache js and template file.
 * auth:bigwhiteshark
 * email:yangxinming@outlook.com
 *
 */
(function(global) {
    var storage = global.localStorage;
    if (storage) {
        var storagePrefix = 'seajs-',
            defaultExpiration = 5000 * 60 * 60 * 1000; //ms unit
        function wrapData(obj) {
            var now = +new Date();
            obj.stamp = now;
            obj.expire = now + (obj.expire || defaultExpiration);
            return obj;
        }
        var cache = {
            add: function(key, storeObj) {
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
                            return cache.add(key, storeObj);
                        } else { // no files to remove. Larger than available quota
                            return;
                        }
                    } else { // some other error
                        return;
                    }
                }
            },

            remove: function(key) {
                storage.removeItem(key);
                return this;
            },

            get: function(key) {
                var item = storage.getItem(key);
                try {
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
                        this.remove(key);
                    }
                }
                return this;
            }
        };

        cache.clear(true); //delete expired item

        seajs.on('config', function(opts) {
            if (seajs.data.disableStore) return;
            var cacheVersion = seajs.data.cacheVersion || 0,
                defaultExpiration = seajs.data.expiration || defaultExpiration;
            var key = storagePrefix + 'cache';
            storeData = cache.get(key);
            var localVersion = storeData ? storeData.version : 0;
            if (localVersion < cacheVersion) {
                cache.clear();
                storeData = wrapData({
                    version: cacheVersion
                });
                cache.add(key, storeData);
            }
        });

        //seajs template ext
        var plugins = {
            'text': {
                ext: [".tpl", ".html"]
            },
            'json': {
                ext: [".json"]
            },
            'handlebars': {
                ext: [".handlebars"]
            },
        };

        // Helpers
        function isPlugin(name) {
            return name && plugins.hasOwnProperty(name)
        }

        function getPluginName(ext) {
            for (var k in plugins) {
                if (isPlugin(k)) {
                    var exts = "," + plugins[k].ext.join(",") + ","
                    if (exts.indexOf("," + ext + ",") > -1) {
                        return k
                    }
                }
            }
        }

        seajs.on('resolve', function(mod) {
            var id = mod.id;
            if (!id || seajs.data.disableStore) return;

            var pluginName;
            // text!path/to/some.xx
            if ((m = id.match(/^(\w+)!(.+)$/)) && isPlugin(m[1])) {
                pluginName = m[1]
                id = m[2]
            }
            // http://path/to/a.tpl
            // http://path/to/c.json?v2
            else if ((m = id.match(/[^?]+(\.\w+)(?:\?|#|$)/))) {
                pluginName = getPluginName(m[1])
            }

            if (pluginName && id.indexOf("#") === -1) {
                id += "#"
            }
            var uri = seajs.resolve(id, mod.refUri),
                key = storagePrefix + uri,
                storeData = cache.get(key);
            if (storeData) {
                var factory = storeData.factory;
                if (/^function/img.test(factory)) { // if factory is function
                    var args = /\((.*)\)/mg.exec(factory)[1]; //get factory arguments
                    factory = /\{((.|[\r\n\t\s])*)\}$/img.exec(factory)[1]; //get factory body
                    factory = new Function(args, factory);
                }
                var mod = seajs.Module.get(uri);
                mod.factory = factory;
                mod.status = seajs.Module.STATUS.LOADED;
            }
        })

        seajs.on('save', function(mod) {
            if (seajs.data.disableStore) return;
            var uri = mod.uri;
            var key = storagePrefix + uri;
            // for http://path/to/c.js?v=xxx ,get single file version
            if (!cache.get(key)) {

                //remove local cached file
                var reg = /\?v=(.*)/;
                var remoteName = key.split('?')[0];
                var remoteVersion = reg.exec(key);
                remoteVersion && (remoteVersion = remoteVersion[1]);
                for (k in storage) {
                    var localName = k.split('?')[0];
                    var localVersion = reg.exec(k);
                    localVersion && (localVersion = localVersion[1]);
                    if (k && localName == remoteName && (localVersion != remoteVersion)) {
                        cache.remove(k);
                    }
                }

                var f = mod.factory;
                f = typeof(f) === 'function' ? f + '' : f;
                var storeData = {
                    factory: f
                };
                storeData = wrapData(storeData);
                cache.add(key, storeData);
            }
        })

        /* seajs.on("request", function(mod) {
            if(!seajs.enableStore) return;
             //console.log('request',mod)
             var uri = mod.uri,
                 key = storagePrefix + uri,
                 storeData = cache.get(key);
             if (storeData) {
                 var mod = seajs.Module.get(uri);
                 mod.exec()
             }
         })*/
    }
})(this);
