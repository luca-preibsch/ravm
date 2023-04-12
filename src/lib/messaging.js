
export const types = {
    getHostInfo : 0,
    redirect : 1,
}

export async function getHostInfo() {
    return await browser.runtime.sendMessage({
        type : types.getHostInfo
    })
}
