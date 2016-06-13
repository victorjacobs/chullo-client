import * as child_process from 'child_process';
import * as os from 'os';

export class Clipboard {
    public static copy(str: string) {
        if (os.platform() !== 'darwin') {
            console.log('Warning: clipboard copy only works on Mac for now');
            return;
        }

        child_process.execSync('pbcopy', {
            input: str,
        });
    }
}
