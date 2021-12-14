import { ixIxxStream } from '../src/'
import tempy from 'tempy'
import fs from 'fs'
import { Readable } from 'stream'

test('test simple', async () => {
  const l1 = tempy.file()
  const l2 = tempy.file()
  const mytext = Readable.from([
    'heart r222222222\n',
    'brain r333333333\n',
    'kidney r111111111\n',
    'leg r111111111\n',
    'toenail r111111111\n',
    'scalp r9999\n',
  ])
  await ixIxxStream(mytext, l1, l2)
  const r1 = fs.readFileSync(l1, 'utf8')
  const r2 = fs.readFileSync(l2, 'utf8')
  expect(r1).toMatchSnapshot()
  expect(r2).toMatchSnapshot()
})

test('volvox sans descriptions', async () => {
  const l1 = tempy.file()
  const l2 = tempy.file()
  const mytext = fs.createReadStream(require.resolve('./volvox.txt'))

  await ixIxxStream(mytext, l1, l2)
  const r1 = fs.readFileSync(l1, 'utf8')
  const r2 = fs.readFileSync(l2, 'utf8')
  expect(r1).toMatchSnapshot()
  expect(r2).toMatchSnapshot()
})

test('volvox with descriptions', async () => {
  const l1 = tempy.file()
  const l2 = tempy.file()
  const mytext = fs.createReadStream(
    require.resolve('./volvox_with_descriptions.txt'),
  )

  await ixIxxStream(mytext, l1, l2)
  const r1 = fs.readFileSync(l1, 'utf8')
  const r2 = fs.readFileSync(l2, 'utf8')
  expect(r1).toMatchSnapshot()
  expect(r2).toMatchSnapshot()
})
