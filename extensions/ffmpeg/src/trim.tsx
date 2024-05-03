import { Action, ActionPanel, Form, Toast, confirmAlert, showToast } from "@raycast/api";
import { executeFFmpegCommandAsync, isFFmpegInstalled } from "./utils/ffmpeg";
import { TipForInstallFFmpeg } from "./components/tipForInstallFFmpeg";
import { getSelectedVideos } from "./utils/fs";
import { formatTime, getTimeInSeconds } from "./utils/time";
import fs from "fs";

const ffmpegInstalled = isFFmpegInstalled();

export default function Trim() {
  if (!ffmpegInstalled) {
    return <TipForInstallFFmpeg />;
  }

  const handleSubmit = async (values: { startTime: string; endTime: string; format: string }) => {
    const paths = getSelectedVideos();

    if (paths.length === 0) {
      await showToast({ title: "Please select a video file.", style: Toast.Style.Failure });
      return;
    }

    try {
      const { startTime, endTime, format } = values;

      const inputFile = paths[0];
      const outputFile = `${inputFile.substring(0, inputFile.lastIndexOf("."))}_trimmed.${format}`;

      const alreadyExists = fs.existsSync(outputFile);

      if (alreadyExists) {
        const deleteExisting = await confirmAlert({
          title: "File already exists",
          message: "The file already exists. Do you want to replace it?",
        });

        if (deleteExisting) {
          fs.unlinkSync(outputFile);
        } else {
          return;
        }
      }

      const command = `-i "${inputFile}" -ss ${startTime} -to ${endTime} -c:v libx264 -c:a aac "${outputFile}"`;

      let totalDuration = 0;

      const convertingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Trimming...",
      });

      await executeFFmpegCommandAsync({
        command: `${command}`,
        onContent: async (data) => {
          console.log(data);
          const match = data.match(/Duration: ([\d:.]+)/);
          if (match && match[1]) {
            totalDuration = getTimeInSeconds(match[1]);
          }

          const timeMatch = data.match(/time=([\d:.]+)/);
          if (timeMatch && timeMatch[1] && totalDuration) {
            const currentTime = getTimeInSeconds(timeMatch[1]);
            const percentage = (currentTime / totalDuration) * 100;
            const percentageRounded = Math.round(percentage * 100) / 100;

            // calculate estimated remaining time
            const remainingTime = ((100 - percentage) / percentage) * currentTime;

            convertingToast.message = `${percentageRounded}% - Estimated remaining time: ${formatTime(remainingTime)}`;
          }
        },
      });

      await showToast({
        title: "Video trimmed",
        style: Toast.Style.Success,
        message: `The video segment has been trimmed and saved as ${outputFile}.`,
      });
    } catch (error) {
      await showToast({
        title: "Error",
        style: Toast.Style.Failure,
        message: (error as Error).message,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Trim Video" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="startTime" title="Start Time (hh:mm:ss)" placeholder="Enter start time" />
      <Form.TextField id="endTime" title="End Time (hh:mm:ss)" placeholder="Enter end time" />
      <Form.Dropdown id="format" title="Output Format">
        <Form.Dropdown.Item title="MP4" value="mp4" />
        <Form.Dropdown.Item title="MKV" value="mkv" />
        <Form.Dropdown.Item title="MOV" value="mov" />
      </Form.Dropdown>
    </Form>
  );
}
