import { createRouter, createWebHistory } from "vue-router";
import EntryList from "@/views/EntryList.vue";
import EntryEditorPage from "@/views/EntryEditorPage.vue";
import SettingsPage from "@/views/SettingsPage.vue";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/",
            redirect: "/entries",
        },
        {
            path: "/entries",
            name: "entry-list",
            component: EntryList,
        },
        {
            path: "/entries/:id",
            name: "entry-edit",
            component: EntryEditorPage,
        },
        {
            path: "/settings",
            name: "settings",
            component: SettingsPage,
        },
    ],
});

export default router;
