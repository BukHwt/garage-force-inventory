import { PrismaClient } from '../../generated/prisma/index.js';
declare const prismaClientSingleton: () => PrismaClient<import("../../generated/prisma/index.js").Prisma.PrismaClientOptions, never, import("../../generated/prisma/runtime/library.js").DefaultArgs>;
declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}
declare const prisma: PrismaClient<import("../../generated/prisma/index.js").Prisma.PrismaClientOptions, never, import("../../generated/prisma/runtime/library.js").DefaultArgs>;
export default prisma;
