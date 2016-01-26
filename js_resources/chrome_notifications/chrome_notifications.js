//reference: https://developers.google.com/web/updates/2015/03/push-notifications-on-the-open-web?hl=en
//useage in your javascript where you will import this js file:
//var config = {
//             serviceEndpoint : "YOUR_END_POINT_IN_AJAX_CALL",
//             serviceWorkerFile: "/service-worker.js",
//             serviceWorkerScope : "/"
//};
//var browserPush = new BrowserPush(config);
//On click/touch/anyevent: browserPush.subscribe(function(err, success){ DO SOMETHING IF SUCCESS OR FAILURE };
//On click/touch/anyevent: browserPush.unsubscribe(function(err, success){ DO SOMETHING IF SUCCESS OR FAILURE };

(function () {

    var BrowserPush = function (config) {
        this._config = config;
    };

    BrowserPush.prototype = {
        _config: {
            serviceEndpoint: './',
            serviceWorkerFile: '/service-worker.js',
            serviceWorkerScope: './'
        },
        _state: null,

        /**
         * getState
         * @param callback
         * @returns subscribed, notSubscribed, denied, notSupported
         */
        getState: function (callback) {
            var _this = this;
            this._check(function (err, state) {
                _this._state = state;
                callback(err, state);
            });
        },

        subscribe: function (callback) {
            var _this = this;
            if (this._state !== 'notSubscribed') {
                callback({message: 'The state "' + this._state + '" is not valid for subscribe'});
                return;
            }

            navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
                serviceWorkerRegistration.pushManager.subscribe({ userVisibleOnly: true })
                    .then(function (pushSubscription) {
                        _this._onPushSubscription(pushSubscription, function (err, res) {
                            _this._state = 'subscribed';
                            callback(err, res);
                        });
                    })
                    .catch(function(e) {
                        if (Notification.permission === 'denied') {
                            callback({message: 'Notifications were denied! You have to manually switch them on.'}, 'denied');
                        } else {
                            callback({message: 'Something went wrong. Check if the ' +
                                'manifest is there with gcm_sender_id and ' +
                                'gcm_user_visible_only. ' + e.message});
                        }
                    });
            });
        },

        unsubscribe: function (callback) {
            var _this = this;
            if (this._state !== 'subscribed' || !this._pushSubscription || !this._pushSubscription.unsubscribe) {
                callback({message: 'Can\'t unsubscribe if state is "' + this._state + '"'});
                return;
            }
              $.ajax({
                    type: 'POST',
                    url : this._config.serviceEndpoint,
                    data: {subscriptionId:_this._pushSubscription.subscriptionId, unsubscribe:true}
                }).success(function(res){
                    callback(null, res);
                }).error(function(err){
                    callback(err);
                })

            this._pushSubscription.unsubscribe().then(function(successful) {
                _this._state = 'notSubscribed';
                callback(null, true);
            }).catch(function(e) {
                callback(e);
            });
        },

        _check: function (callback) {
            var _this = this;
            // Make sure we can show notifications
            if (!('Notification' in window)) {
                callback({message: 'Notifications are not supported'}, 'notSupported');
                return;
            }

            // If the notification permission is denied, it's a permanent block
            if (Notification.permission === 'denied') {
                callback({message: 'Notifications were denied'}, 'denied');
                return;
            }

            if (!('serviceWorker' in navigator)) {
                callback({message: 'Service workers are not supported'}, 'notSupported');
                return;
            }

            navigator.serviceWorker.register(this._config.serviceWorkerFile, {
                scope: this._config.serviceWorkerScope
            }).then(function () {
                navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
                    // Check if this service worker supports push
                    if (!serviceWorkerRegistration.pushManager) {
                        callback({message: 'Service worker does not support push'}, 'notSupported');
                        return;
                    }

                    serviceWorkerRegistration.pushManager.getSubscription().then(function(pushSubscription) {
                        if (pushSubscription) {
                            _this._pushSubscription = pushSubscription;
                            callback(null, 'subscribed');
                        } else {
                            callback(null, 'notSubscribed');
                        }
                    }).catch(function(e) {
                        callback(e);
                    });
                }).catch(function(e) {
                    callback(e);
                });
            }).catch(function(e) {
                callback(e);
            });
        },

        _onPushSubscription: function (pushSubscription, callback) {
            try {
                var pushEndPoint = pushSubscription.endpoint;
                var subscriptionId = pushSubscription.subscriptionId;
                //Most likely you would want to send ajax call to call where once a subscriber subscribed to your app
                $.ajax({
                    type: 'POST',
                    url : this._config.serviceEndpoint,
                    data: {subscriptionId:subscriptionId}
                }).success(function(res){
                    callback(null, res);
                }).error(function(err){
                    callback(err);
                });
            } catch (err) {
                callback(err);
            }
        }
    };

    window.BrowserPush = BrowserPush;
})();