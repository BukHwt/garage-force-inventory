import { PrismaClient } from '../../generated/prisma';
declare const prismaClientSingleton: () => PrismaClient<import("../../generated/prisma").Prisma.PrismaClientOptions, never, import("../../generated/prisma/runtime/library").DefaultArgs>;
declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}
declare const prisma: PrismaClient<import("../../generated/prisma").Prisma.PrismaClientOptions, never, import("../../generated/prisma/runtime/library").DefaultArgs>;
export default prisma;
