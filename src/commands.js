import * as Util from './util';
import { Errors } from './const';

const helpCommands = [
    'clear',
    'ls',
    'cat',
    'mkdir',
    'cd',
    'pwd',
    'echo',
    'printenv',
    'whoami',
    'rm',
    'view',
];

export const help = {
    exec: (state) => {
        return Object.assign({}, state, {
            history: state.history.concat(
                { value: 'React-bash:' },
                {
                    value: 'These shell commands are defined internally:',
                },
                ...helpCommands.map((value) => ({ value })),
                {
                    value:
                        'please use view [valid file] to learn more about me.',
                }
            ),
        });
    },
};

export const clear = {
    exec: (state) => {
        return Object.assign({}, state, { history: [] });
    },
};

export const ls = {
    exec: (state, { flags, args }) => {
        const path = args[0] || '';
        const fullPath = Util.extractPath(path, state.cwd);
        const { err, dir } = Util.getDirectoryByPath(state.structure, fullPath);

        if (err) {
            return Util.appendError(state, err, path);
        } else {
            let content = Object.keys(dir);
            if (!flags.a) {
                content = content.filter((name) => name[0] !== '.');
            }
            if (flags.l) {
                return Object.assign({}, state, {
                    history: state.history.concat(
                        content.map((value) => {
                            return { value };
                        })
                    ),
                });
            } else {
                return Object.assign({}, state, {
                    history: state.history.concat({ value: content.join(' ') }),
                });
            }
        }
    },
};

export const cat = {
    exec: (state, { args }) => {
        const path = args[0];
        const relativePath = path.split('/');
        const fileName = relativePath.pop();
        const fullPath = Util.extractPath(relativePath.join('/'), state.cwd);
        const { err, dir } = Util.getDirectoryByPath(state.structure, fullPath);
        if (err) {
            return Util.appendError(state, err, path);
        } else if (!dir[fileName]) {
            return Util.appendError(state, Errors.NO_SUCH_FILE, path);
        } else if (!dir[fileName].hasOwnProperty('content')) {
            return Util.appendError(state, Errors.IS_A_DIRECTORY, path);
        } else {
            const content = dir[fileName].content.replace(/\n$/, '');
            const lines = content.split('\n').map((value) => ({ value }));
            // console.log(lines);
            return Object.assign({}, state, {
                history: state.history.concat(lines),
            });
        }
    },
};

export const mkdir = {
    exec: (state, { args }) => {
        const path = args[0];
        const relativePath = path.split('/');
        const newDirectory = relativePath.pop();
        const fullPath = Util.extractPath(relativePath.join('/'), state.cwd);
        const deepCopy = JSON.parse(JSON.stringify(state.structure));
        const { dir } = Util.getDirectoryByPath(deepCopy, fullPath);

        if (dir[newDirectory]) {
            return Util.appendError(state, Errors.FILE_EXISTS, path);
        } else {
            dir[newDirectory] = {};
            return Object.assign({}, state, { structure: deepCopy });
        }
    },
};

export const cd = {
    exec: (state, { args }) => {
        const path = args[0];
        if (!path || path === '/') {
            return Object.assign({}, state, { cwd: '' });
        }

        const fullPath = Util.extractPath(path, state.cwd);
        const { err } = Util.getDirectoryByPath(state.structure, fullPath);

        if (err) {
            return Util.appendError(state, err, path);
        } else {
            return Object.assign({}, state, { cwd: fullPath });
        }
    },
};

export const pwd = {
    exec: (state) => {
        const directory = `/${state.cwd}`;
        return Object.assign({}, state, {
            history: state.history.concat({ value: directory }),
        });
    },
};

export const echo = {
    exec: (state, { input }) => {
        const ECHO_LENGTH = 'echo '.length;
        const envVariables = Util.getEnvVariables(state);
        const value = input.slice(ECHO_LENGTH).replace(/(\$\w+)/g, (key) => {
            return envVariables[key.slice(1)] || '';
        });
        return Object.assign({}, state, {
            history: state.history.concat({ value }),
        });
    },
};

export const printenv = {
    exec: (state) => {
        const envVariables = Util.getEnvVariables(state);
        const values = Object.keys(envVariables).map((key) => {
            return { value: `${key}=${envVariables[key]}` };
        });
        return Object.assign({}, state, {
            history: state.history.concat(values),
        });
    },
};

export const whoami = {
    exec: (state) => {
        const value = state.settings.user.username;
        return Object.assign({}, state, {
            history: state.history.concat({ value }),
        });
    },
};

export const rm = {
    exec: (state, { flags, args }) => {
        const path = args[0];
        const relativePath = path.split('/');
        const file = relativePath.pop();
        const fullPath = Util.extractPath(relativePath.join('/'), state.cwd);
        const deepCopy = JSON.parse(JSON.stringify(state.structure));
        const { dir } = Util.getDirectoryByPath(deepCopy, fullPath);

        if (dir[file]) {
            // folder deletion requires the recursive flags `-r` or `-R`
            if (!Util.isFile(dir[file]) && !(flags.r || flags.R)) {
                return Util.appendError(state, Errors.IS_A_DIRECTORY, path);
            }
            delete dir[file];
            return Object.assign({}, state, { structure: deepCopy });
        } else {
            return Util.appendError(state, Errors.NO_SUCH_FILE, path);
        }
    },
};

/*
View is going to be a bit more complex since it takes in arguments - looking at cat for
a good example to go off of
*/
export const view = {
    exec: (state, { args }) => {
        const path = args[0];
        const relativePath = path.split('/');
        const fileName = relativePath.pop();
        const fullPath = Util.extractPath(relativePath.join('/'), state.cwd);
        const { err, dir } = Util.getDirectoryByPath(state.structure, fullPath);
        if (err) {
            return Util.appendError(state, err, path);
        } else if (!dir[fileName]) {
            return Util.appendError(state, Errors.NO_SUCH_FILE, path);
        } else if (!dir[fileName].hasOwnProperty('type')) {
            return Util.appendError(state, Errors.NOT_A_SPECIAL_FILE, path);
        } else if (
            !dir[fileName].hasOwnProperty('content') &&
            !dir[fileName].hasOwnProperty('type')
        ) {
            return Util.appendError(state, Errors.IS_A_DIRECTORY, path);
        } else {
            /* instead of doing a little bit of intermediate parsing like what
            cat does, I want to display on the frontend some other react stuff,
            perhaps in a file */
            state.openAppHandler(fileName);
            return Object.assign({}, state, {
                history: state.history.concat({ value: '' }),
            });
        }
    },
};
