export async function timeout(ms = 1000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

