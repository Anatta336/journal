import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import JournalEditor from "@/components/JournalEditor.vue";

describe("EditorToolbar", () => {
    it("renders all toolbar buttons", async () => {
        const wrapper = mount(JournalEditor);
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-testid="toolbar-bold"]').exists()).toBe(
            true,
        );
        expect(wrapper.find('[data-testid="toolbar-italic"]').exists()).toBe(
            true,
        );
        expect(wrapper.find('[data-testid="toolbar-code"]').exists()).toBe(
            true,
        );
        expect(
            wrapper.find('[data-testid="toolbar-code-block"]').exists(),
        ).toBe(true);
        expect(
            wrapper.find('[data-testid="toolbar-bullet-list"]').exists(),
        ).toBe(true);
    });
});
