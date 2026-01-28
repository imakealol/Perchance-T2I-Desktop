import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import 'primeicons/primeicons.css'
import { createPinia } from 'pinia'
import { localStoragePlugin } from './utils/persistencePlugin'
import Tooltip from 'primevue/tooltip';

const app = createApp(App)

const pinia = createPinia()
pinia.use(localStoragePlugin)
app.use(pinia)
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '.p-dark'
        }
    }
})
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
app.use(ConfirmationService);
app.use(ToastService);
app.directive('tooltip', Tooltip);

app.mount('#app')
