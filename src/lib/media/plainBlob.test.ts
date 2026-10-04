import { describe, expect, it } from 'vitest'
import { plainBlob } from './plainBlob'

const read = (b: Blob) => new Promise<string>((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsText(b) })

describe('plainBlob', () => {
  it('copies the bytes and the type into a new in-memory blob', async () => {
    const file = new File(['sunset'], 'sunset.jpg', { type: 'image/jpeg' })
    const copy = await plainBlob(file)
    expect(copy).not.toBe(file)
    expect(copy).not.toBeInstanceOf(File) // no longer tied to the picked file
    expect(copy.type).toBe('image/jpeg')
    expect(copy.size).toBe(6)
    expect(await read(copy)).toBe('sunset')
  })

  it('works where Blob.arrayBuffer does not exist', async () => {
    const old = new Blob(['abc'], { type: 'audio/webm' })
    Object.defineProperty(old, 'arrayBuffer', { value: undefined })
    const copy = await plainBlob(old)
    expect(copy.type).toBe('audio/webm')
    expect(await read(copy)).toBe('abc')
  })
})
