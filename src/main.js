import Vue from 'vue';
import './styles/main.scss';
import store from './vuex/store';
import router from './router/routes';
import VueRouter from 'vue-router';
import { BootstrapVue } from 'bootstrap-vue';
import App from './App.vue';
import VueNativeSock from 'vue-native-websocket';
import Axios from 'axios';
import { apiUrl } from './helpers/url';

Vue.config.productionTip = false;

// This will register bootstrap tags such as <b-modal>
// to be available to all components
Vue.use(BootstrapVue);
Vue.use(VueRouter);
Vue.use(VueNativeSock, process.env.VUE_APP_WS_URL, {
  store,
  format: 'JSON',
  reconnection: true,
  reconnectionDelay: 5000,
  passToStoreHandler: (eventName, event, defaultHandler) => {
    if (eventName === 'SOCKET_onopen') {
      store.dispatch('onSocketOpen', event);
    }
    defaultHandler(eventName, event);
  },
});

Vue.prototype.$http = Axios;
Vue.prototype.$http.defaults.baseURL = apiUrl('/');
Vue.prototype.$http.defaults.headers.common['Content-Type'] = 'application/json';
Vue.prototype.$http.defaults.headers.common['Accept'] = 'application/json';
Vue.prototype.$http.defaults.headers.common['Authorization'] = store.getters.token;

new Vue({
  render: (h) => h(App),
  store,
  router,
}).$mount('#app');
