import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JournalEditor from '@/components/JournalEditor.vue'

describe('JournalEditor', () => {
    it('mounts and renders an editable content area', async () => {
        const wrapper = mount(JournalEditor)

        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        const editorContent = wrapper.find('[data-testid="editor-content"]')
        expect(editorContent.exists()).toBe(true)
        expect(editorContent.attributes('contenteditable')).toBe('true')
    })

    it('setting content with **bold** displays styled bold text', async () => {
        const wrapper = mount(JournalEditor)
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        const component = wrapper.vm as unknown as { setMarkdown: (content: string) => void }
        component.setMarkdown('This is **bold** text')
        await wrapper.vm.$nextTick()

        const editorContent = wrapper.find('[data-testid="editor-content"]')
        const strongElement = editorContent.find('strong')
        expect(strongElement.exists()).toBe(true)
        expect(strongElement.text()).toBe('bold')
        expect(editorContent.text()).not.toContain('**')
    })

    it('calling getMarkdown() on content with bold text returns **bold**', async () => {
        const wrapper = mount(JournalEditor)
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()

        const component = wrapper.vm as unknown as {
            setMarkdown: (content: string) => void;
            getMarkdown: () => string;
        }

        component.setMarkdown('**bold** text')
        await wrapper.vm.$nextTick()

        const markdown = component.getMarkdown()
        expect(markdown).toContain('**bold**')
    })
})