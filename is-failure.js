function main (args) {
    if (args.status !== 'failed' && args.status !== 'errored') {
        return { 'error': 'Build succeeded or no build info.' };
    } else {
        return {};
    }
}
