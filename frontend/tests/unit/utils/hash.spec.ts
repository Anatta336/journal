import { describe, it, expect } from 'vitest'
import { calculateEntryHash, calculateGlobalHash } from '@/utils/hash'

describe('calculateEntryHash', () => {
    it('should return different hash when tags are added', async () => {
        const content = 'Test content'
        const hashWithoutTags = await calculateEntryHash(content)
        const hashWithTags = await calculateEntryHash(content, { tags: ['work'] })

        expect(hashWithoutTags).not.toBe(hashWithTags)
    })

    it('should return different hash when tags are removed', async () => {
        const content = 'Test content'
        const hashWithTags = await calculateEntryHash(content, { tags: ['work'] })
        const hashWithoutTags = await calculateEntryHash(content)

        expect(hashWithTags).not.toBe(hashWithoutTags)
    })

    it('should return different hash when tags are modified', async () => {
        const content = 'Test content'
        const hash1 = await calculateEntryHash(content, { tags: ['work'] })
        const hash2 = await calculateEntryHash(content, { tags: ['personal'] })

        expect(hash1).not.toBe(hash2)
    })

    it('should return same hash for undefined tags and empty tags array', async () => {
        const content = 'Test content'
        const hashUndefined = await calculateEntryHash(content)
        const hashEmpty = await calculateEntryHash(content, { tags: [] })
        const hashUndefinedExplicit = await calculateEntryHash(content, { tags: undefined })

        expect(hashUndefined).toBe(hashEmpty)
        expect(hashUndefined).toBe(hashUndefinedExplicit)
    })

    it('should return same hash regardless of tag order', async () => {
        const content = 'Test content'
        const hash1 = await calculateEntryHash(content, { tags: ['work', 'personal', 'journal'] })
        const hash2 = await calculateEntryHash(content, { tags: ['journal', 'work', 'personal'] })
        const hash3 = await calculateEntryHash(content, { tags: ['personal', 'journal', 'work'] })

        expect(hash1).toBe(hash2)
        expect(hash1).toBe(hash3)
    })

    it('should return consistent hash for same inputs', async () => {
        const content = 'Test content'
        const hash1 = await calculateEntryHash(content, { tags: ['work'] })
        const hash2 = await calculateEntryHash(content, { tags: ['work'] })

        expect(hash1).toBe(hash2)
    })

    it('should return a valid SHA-256 hex string', async () => {
        const hash = await calculateEntryHash('Test content')
        expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })
})

describe('calculateGlobalHash', () => {
    it('should calculate hash of sorted entry hashes', async () => {
        const entries = [
            { id: 'b', hash: 'hash-b' },
            { id: 'a', hash: 'hash-a' },
        ]
        const hash = await calculateGlobalHash(entries)
        expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should return same hash regardless of entry order', async () => {
        const entries1 = [
            { id: 'a', hash: 'hash-a' },
            { id: 'b', hash: 'hash-b' },
        ]
        const entries2 = [
            { id: 'b', hash: 'hash-b' },
            { id: 'a', hash: 'hash-a' },
        ]
        const hash1 = await calculateGlobalHash(entries1)
        const hash2 = await calculateGlobalHash(entries2)
        expect(hash1).toBe(hash2)
    })
})
