import { prisma } from '@/lib/prisma'

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test.taskflow' } } })
})

afterAll(async () => {
  await prisma.$disconnect()
})
