using System.Collections;
using System.IO;
using UnityEngine;

/// <summary>
/// Optional command-line switches for a standalone build, used to record the README animation:
///   -autoHunter            turn the automatic hunter on
///   -hunterRule Dullest    BrightestFirst (default) | DullestFirst | Random
///   -timeScale 4           run the generations faster
///   -recordFrames &lt;dir&gt;   save every n-th frame (screen incl. the on-screen info box) as PNG
///   -recordEvery 6  -recordCount 400
/// Without these arguments the component does nothing.
/// </summary>
public class DemoRecorder : MonoBehaviour
{
    [SerializeField] private PopulationManager manager;

    private void Awake()
    {
        string[] args = System.Environment.GetCommandLineArgs();
        if (manager == null) manager = FindAnyObjectByType<PopulationManager>();

        if (Has(args, "-autoHunter")) manager.SetAutomaticHunter(true);
        if (System.Enum.TryParse(Value(args, "-hunterRule"), out HunterRule rule)) manager.Settings.hunterRule = rule;
        if (float.TryParse(Value(args, "-timeScale"), System.Globalization.NumberStyles.Float,
                           System.Globalization.CultureInfo.InvariantCulture, out float scale))
            Time.timeScale = scale;

        string dir = Value(args, "-recordFrames");
        if (!string.IsNullOrEmpty(dir))
        {
            int every = int.TryParse(Value(args, "-recordEvery"), out int e) ? e : 6;
            int count = int.TryParse(Value(args, "-recordCount"), out int c) ? c : 400;
            StartCoroutine(Record(dir, every, count));
        }
    }

    private static IEnumerator Record(string dir, int every, int count)
    {
        Directory.CreateDirectory(dir);
        // Fixed game time per frame, however slow the capture is: the animation stays smooth and reproducible.
        Time.captureFramerate = 30;
        for (int saved = 0, frame = 0; saved < count; frame++)
        {
            yield return new WaitForEndOfFrame();
            if (frame % every != 0) continue;
            Texture2D shot = ScreenCapture.CaptureScreenshotAsTexture();
            File.WriteAllBytes(Path.Combine(dir, $"frame_{saved:0000}.png"), shot.EncodeToPNG());
            Destroy(shot);
            saved++;
        }
        Application.Quit();
    }

    private static bool Has(string[] args, string name) => System.Array.IndexOf(args, name) >= 0;

    private static string Value(string[] args, string name)
    {
        int i = System.Array.IndexOf(args, name);
        return i >= 0 && i + 1 < args.Length ? args[i + 1] : null;
    }
}
