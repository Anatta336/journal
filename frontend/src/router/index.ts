import { createRouter, createWebHistory } from 'vue-router'
import EntryList from '@/views/EntryList.vue'
import EntryEditorPage from '@/views/EntryEditorPage.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            redirect: '/entries',
        },
        {
            path: '/entries',
            name: 'entry-list',
            component: EntryList,
        },
        {
            path: '/entries/new',
            name: 'entry-new',
            component: EntryEditorPage,
        },
        {
            path: '/entries/:id',
            name: 'entry-edit',
            component: EntryEditorPage,
        },
    ],
})

export default router
