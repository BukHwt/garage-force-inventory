declare const prismaClientSingleton: () => any;
declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}
declare const prisma: any;
export default prisma;
