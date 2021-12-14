import { ixIxxStream } from '../src/'
import tmp from 'tmp'
import fs from 'fs'
import { Readable } from 'stream'

test('test simple', async () => {
  const l1 = tmp.fileSync()
  const l2 = tmp.fileSync()
  const mytext = Readable.from([
    'heart r222222222\n',
    'brain r333333333\n',
    'kidney r111111111\n',
    'leg r111111111\n',
    'toenail r111111111\n',
    'scalp r9999\n',
  ])
  await ixIxxStream(mytext, l1.name, l2.name)
  const r1 = fs.readFileSync(l1.name, 'utf8')
  const r2 = fs.readFileSync(l2.name, 'utf8')
  expect(r1).toMatchSnapshot()
  expect(r2).toMatchSnapshot()
})

test('volvox sans descriptions', async () => {
  const l1 = tmp.fileSync()
  const l2 = tmp.fileSync()
  const mytext = fs.createReadStream(require.resolve('./volvox.txt'))

  await ixIxxStream(mytext, l1.name, l2.name)
  const r1 = fs.readFileSync(l1.name, 'utf8')
  const r2 = fs.readFileSync(l2.name, 'utf8')
  expect(r1).toMatchSnapshot()
  expect(r2).toMatchSnapshot()
})

test('volvox with descriptions', async () => {
  const l1 = tmp.fileSync()
  const l2 = tmp.fileSync()

  const mytext = fs.createReadStream(
    require.resolve('./volvox_with_descriptions.txt'),
  )

  await ixIxxStream(mytext, l1.name, l2.name)
  const r1 = fs.readFileSync(l1.name, 'utf8')
  const r2 = fs.readFileSync(l2.name, 'utf8')
  expect(r1).toMatchSnapshot()
  expect(r2).toMatchSnapshot()
})
