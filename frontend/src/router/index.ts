import { createRouter, createWebHistory } from "vue-router";
import EntryList from "@/views/EntryList.vue";
import EntryEditorPage from "@/views/EntryEditorPage.vue";
import SettingsPage from "@/views/SettingsPage.vue";
import LoginView from "@/views/LoginView.vue";
import { getToken } from "@/services/auth";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: "/",
            redirect: "/entries",
        },
        {
            path: "/login",
            name: "login",
            component: LoginView,
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

router.beforeEach((to) => {
    const token = getToken();
    if (!token && to.name !== "login") {
        return { name: "login" };
    }
    if (token && to.name === "login") {
        return { name: "entry-list" };
    }
});

export default router;
