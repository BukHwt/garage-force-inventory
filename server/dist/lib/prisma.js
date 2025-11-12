import { PrismaClient } from '../../generated/prisma';
const prismaClientSingleton = () => {
    return new PrismaClient();
};
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();
export default prisma;
if (process.env.NODE_ENV !== 'production')
    globalThis.prismaGlobal = prisma;
//# sourceMappingURL=prisma.js.map