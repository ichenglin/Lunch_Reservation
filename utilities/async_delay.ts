export default async function async_delay(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve, reject) => setTimeout(resolve, milliseconds));
}