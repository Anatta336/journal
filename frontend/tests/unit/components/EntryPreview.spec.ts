import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import EntryPreview from "@/components/EntryPreview.vue";

describe("EntryPreview", () => {
    it("renders markdown content as HTML", async () => {
        const content = "# Hello\nThis is **bold**";
        const wrapper = mount(EntryPreview, {
            props: { content },
        });

        expect(wrapper.html()).toContain("<h1>Hello</h1>");
        expect(wrapper.html()).toContain("<strong>bold</strong>");
    });

    it("detects overflow and applies has-overflow class", async () => {
        // Mock scrollHeight and clientHeight
        const wrapper = mount(EntryPreview, {
            props: { content: "Some content" },
        });

        const element = wrapper.element as HTMLElement;

        // Mock scrollHeight > clientHeight
        vi.spyOn(element, "scrollHeight", "get").mockReturnValue(100);
        vi.spyOn(element, "clientHeight", "get").mockReturnValue(50);

        // Trigger checkOverflow
        await (wrapper.vm as any).checkOverflow();

        expect(wrapper.classes()).toContain("has-overflow");
    });

    it("does not apply has-overflow class when content fits", async () => {
        const wrapper = mount(EntryPreview, {
            props: { content: "Short content" },
        });

        const element = wrapper.element as HTMLElement;

        // Mock scrollHeight <= clientHeight
        vi.spyOn(element, "scrollHeight", "get").mockReturnValue(40);
        vi.spyOn(element, "clientHeight", "get").mockReturnValue(50);

        // Trigger checkOverflow
        await (wrapper.vm as any).checkOverflow();

        expect(wrapper.classes()).not.toContain("has-overflow");
    });

    it("updates overflow status when content changes", async () => {
        const wrapper = mount(EntryPreview, {
            props: { content: "Initial" },
        });

        const element = wrapper.element as HTMLElement;
        const scrollHeightSpy = vi.spyOn(element, "scrollHeight", "get");
        const clientHeightSpy = vi.spyOn(element, "clientHeight", "get");

        // First state: no overflow
        scrollHeightSpy.mockReturnValue(40);
        clientHeightSpy.mockReturnValue(50);
        await (wrapper.vm as any).checkOverflow();
        expect(wrapper.classes()).not.toContain("has-overflow");

        // Second state: overflow
        scrollHeightSpy.mockReturnValue(100);
        await wrapper.setProps({
            content: "Much longer content that overflows",
        });
        // watch will trigger checkOverflow
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();

        expect(wrapper.classes()).toContain("has-overflow");
    });
});
