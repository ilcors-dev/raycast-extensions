import { execSync, spawn } from "child_process";
import stripAnsi from "strip-ansi";

/**
 * Get the path of the FFmpeg command by executing a shell script that checks common locations
 *
 * @returns {string}
 */
export function getFFmpegPath(): string {
  const commandFolderPath = execSync(`
  locations=(
      /usr/local/bin
      /usr/bin
      /bin
      /usr/sbin
      /sbin
      /opt/X11/bin
      /opt/homebrew/bin
      /usr/local/Cellar
  )
  
  for location in "\${locations[@]}"
  do
      if [ -f "$location/ffmpeg" ]
      then
          echo "$location"
          exit 0
      fi
  done
  
  echo ""
`)
    .toString()
    .trim();

  if (commandFolderPath) {
    return commandFolderPath.replace(/\n/gi, "") + "/ffmpeg";
  }
  return "";
}

export function isFFmpegInstalled() {
  return !!getFFmpegPath();
}

/**
 * Get the path of the FFprobe command by executing a shell script that checks common locations
 *
 * @returns {string}
 */
export function getFFprobePath(): string {
  return (
    execSync(`
    locations=(
        /usr/local/bin
        /usr/bin
        /bin
        /usr/sbin
        /sbin
        /opt/X11/bin
        /opt/homebrew/bin
        /usr/local/Cellar
    )
    
    for location in "\${locations[@]}"
    do
        if [ -f "$location/ffprobe" ]
        then
            echo "$location"
            exit 0
        fi
    done
    
    echo ""
  `)
      .toString()
      .trim()
      .replace(/\n/gi, "") + "/ffprobe"
  );
}

export function executeFFmpegCommand(command: string) {
  return execSync(`${getFFmpegPath()} ${command}`).toString();
}

export function executeFFprobeCommand(command: string) {
  return execSync(`${getFFprobePath()} ${command}`).toString();
}

/**
 * Execute an FFmpeg command asynchronously.
 *
 * The `onContent` callback is called whenever there is new content from the command.
 *
 * @param param0 the configuration object
 * @returns
 */
export function executeFFmpegCommandAsync({
  command,
  onContent,
}: {
  command: string;
  onContent?: (content: string) => void;
}) {
  return new Promise((resolve) => {
    const child = spawn(`${getFFmpegPath()} ${command}`, { shell: true });
    if (onContent) {
      child.stdout.on("data", (data) => {
        onContent(stripAnsi(data.toString()));
      });

      child.stderr.on("data", (data) => {
        onContent(stripAnsi(data.toString()));
      });
    }

    child.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
      resolve(code);
    });
  });
}

/**
 * Execute an FFprobe command asynchronously.
 *
 * The `onContent` callback is called whenever there is new content from the command.
 *
 * @param param0 the configuration object
 * @returns
 */
export function executeFFprobeCommandAsync({
  command,
  onContent,
}: {
  command: string;
  onContent: (content: string) => void;
}) {
  return new Promise((resolve) => {
    const child = spawn(`${getFFprobePath()} ${command}`, { shell: true });
    child.stdout.on("data", (data) => {
      onContent(stripAnsi(data.toString()));
    });

    child.stderr.on("data", (data) => {
      onContent(stripAnsi(data.toString()));
    });

    child.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
      resolve(code);
    });
  });
}
