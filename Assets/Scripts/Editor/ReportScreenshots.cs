using System;
using System.IO;
using System.Runtime.InteropServices;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditorInternal;
using UnityEngine;

/// <summary>
/// Takes the Unity Editor screenshots used in the report (menu: Genetik Algoritma / 4. Rapor Görüntülerini Al).
/// Walks through the steps below, enters Play mode where needed and saves the main editor window as PNG.
/// The scene is never saved: temporary Inspector changes are discarded by re-opening the scene at the end.
/// State survives the domain reload of entering Play mode through SessionState.
/// </summary>
[InitializeOnLoad]
public static class ReportScreenshots
{
    private const string RequestFile = "Temp/report_capture.request";
    private const string DoneFile = "Temp/report_capture.done";
    private const string OutDir = "docs/week06/images/editor";
    private const string StepKey = "GAShots.Step", TimeKey = "GAShots.T0", EnteredKey = "GAShots.Entered";

    // seconds to wait in each step (after Play/Stop transitions have finished)
    private static readonly float[] Wait = { 0f, 3f, 3f, 4f, 3f, 22f, 3f, 4f };

    static ReportScreenshots()
    {
        EditorApplication.update += Tick;
    }

    [MenuItem("Genetik Algoritma/4. Rapor Görüntülerini Al")]
    public static void Begin()
    {
        Directory.CreateDirectory(OutDir);
        if (File.Exists(DoneFile)) File.Delete(DoneFile);
        SessionState.SetInt(StepKey, 1);
        SessionState.SetBool(EnteredKey, false);
    }

    private static double Now => EditorApplication.timeSinceStartup;

    private static void Tick()
    {
        if (File.Exists(RequestFile))
        {
            File.Delete(RequestFile);
            Begin();
        }

        int step = SessionState.GetInt(StepKey, 0);
        if (step == 0) return;

        if (step == 1 && EditorApplication.isPlayingOrWillChangePlaymode)
        {
            EditorApplication.isPlaying = false; // start from Edit mode
            return;
        }

        if (!SessionState.GetBool(EnteredKey, false))
        {
            SessionState.SetBool(EnteredKey, true);
            SessionState.SetFloat(TimeKey, (float)Now);
            try { Enter(step); } catch (Exception e) { Fail(e); }
            return;
        }

        bool wantsPlay = step == 3 || step == 5;
        bool wantsStop = step == 4 || step == 6;
        if ((wantsPlay && !EditorApplication.isPlaying) || (wantsStop && EditorApplication.isPlayingOrWillChangePlaymode)
            || EditorApplication.isCompiling)
        {
            SessionState.SetFloat(TimeKey, (float)Now);
            return;
        }
        if (step == 5 && EditorApplication.isPlaying) Time.timeScale = 6f; // fast-forward the generations

        if (Now - SessionState.GetFloat(TimeKey, 0f) < Wait[step]) return;

        try { Leave(step); } catch (Exception e) { Fail(e); return; }
        int next = step + 1 < Wait.Length ? step + 1 : 0;
        SessionState.SetInt(StepKey, next);
        SessionState.SetBool(EnteredKey, false);
        if (next == 0)
        {
            File.WriteAllText(DoneFile, "ok");
            Debug.Log("GA: report screenshots saved to " + OutDir);
        }
    }

    private static void Enter(int step)
    {
        switch (step)
        {
            case 1: // scene + PopulationManager settings in the Inspector
                ClearConsole();
                EditorSceneManager.OpenScene(CamouflageSceneBuilder.ScenePath, OpenSceneMode.Single);
                Selection.activeGameObject = GameObject.Find("PopulationManager");
                ExpandSettingsInInspector();
                FocusGameView();
                EditorApplication.ExecuteMenuItem("Window/General/Project");
                break;
            case 2: // Person prefab: SpriteRenderer + CircleCollider2D + DNA
                Selection.activeObject = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Person.prefab");
                EditorGUIUtility.PingObject(Selection.activeObject);
                break;
            case 3: // first generation, player is the hunter
                Selection.activeGameObject = GameObject.Find("PopulationManager");
                FocusGameView();
                EditorApplication.isPlaying = true;
                break;
            case 4:
                EditorApplication.isPlaying = false;
                break;
            case 5: // automatic hunter (brightest first), several generations later, console visible
                SetAutomaticHunter(true);
                ClearConsole();
                EditorApplication.ExecuteMenuItem("Window/General/Console");
                EditorApplication.isPlaying = true;
                break;
            case 6:
                EditorApplication.isPlaying = false;
                break;
            case 7: // package used for input
                EditorApplication.ExecuteMenuItem("Window/General/Project");
                UnityEditor.PackageManager.UI.Window.Open("com.unity.inputsystem");
                break;
        }
    }

    private static void Leave(int step)
    {
        switch (step)
        {
            case 1: Capture("01_scene_population_manager.png"); break;
            case 2: Capture("02_person_prefab.png"); break;
            case 3: Capture("03_play_generation1.png"); break;
            case 5: Capture("04_play_auto_hunter_console.png"); break;
            case 7:
                Capture("05_package_manager_input_system.png");
                // leave the editor as we found it, without saving the temporary changes
                EditorSceneManager.OpenScene(CamouflageSceneBuilder.ScenePath, OpenSceneMode.Single);
                FocusGameView();
                break;
        }
    }

    private static void SetAutomaticHunter(bool on)
    {
        var manager = UnityEngine.Object.FindAnyObjectByType<PopulationManager>();
        var so = new SerializedObject(manager);
        so.FindProperty("automaticHunter").boolValue = on;
        so.ApplyModifiedPropertiesWithoutUndo();
        Selection.activeGameObject = manager.gameObject;
    }

    private static void ExpandSettingsInInspector()
    {
        var manager = UnityEngine.Object.FindAnyObjectByType<PopulationManager>();
        var so = new SerializedObject(manager);
        so.FindProperty("settings").isExpanded = true; // editor UI state only, not scene data
        ActiveEditorTracker.sharedTracker.ForceRebuild();
    }

    private static void FocusGameView()
    {
        var gameViewType = Type.GetType("UnityEditor.GameView,UnityEditor");
        if (gameViewType == null) return;
        EditorWindow gameView = EditorWindow.GetWindow(gameViewType, false, null, true);
        // Scale 1x so the whole game screen (including the info box) is visible
        var snapZoom = gameViewType.GetMethod("SnapZoom",
            System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public);
        if (snapZoom != null) snapZoom.Invoke(gameView, new object[] { 1f });
        else Debug.LogWarning("GA: GameView.SnapZoom not found, Game view scale unchanged");
    }

    private static void ClearConsole()
    {
        Type.GetType("UnityEditor.LogEntries,UnityEditor")?.GetMethod("Clear")?.Invoke(null, null);
    }

    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] private static extern bool ShowWindow(IntPtr hWnd, int cmd);

    /// <summary>ReadScreenPixel copies whatever is on screen, so the editor must be the foreground window.</summary>
    private static bool EditorIsForeground()
    {
        uint own = (uint)System.Diagnostics.Process.GetCurrentProcess().Id;
        GetWindowThreadProcessId(GetForegroundWindow(), out uint fg);
        if (fg == own) return true;
        IntPtr main = System.Diagnostics.Process.GetCurrentProcess().MainWindowHandle;
        ShowWindow(main, 3); // maximize
        SetForegroundWindow(main);
        GetWindowThreadProcessId(GetForegroundWindow(), out fg);
        return fg == own;
    }

    private static void Capture(string file)
    {
        if (!EditorIsForeground())
            throw new InvalidOperationException("Unity is not the foreground window; screenshot not taken: " + file);
        Rect r = EditorGUIUtility.GetMainWindowPosition();
        int w = Mathf.RoundToInt(r.width), h = Mathf.RoundToInt(r.height);
        Color[] pixels = InternalEditorUtility.ReadScreenPixel(r.position, w, h);
        var tex = new Texture2D(w, h, TextureFormat.RGB24, false);
        tex.SetPixels(pixels);
        tex.Apply();
        File.WriteAllBytes(Path.Combine(OutDir, file), tex.EncodeToPNG());
        UnityEngine.Object.DestroyImmediate(tex);
        Debug.Log("GA: captured " + file);
    }

    private static void Fail(Exception e)
    {
        SessionState.SetInt(StepKey, 0);
        if (EditorApplication.isPlaying) EditorApplication.isPlaying = false;
        File.WriteAllText(DoneFile, "error: " + e);
        Debug.LogException(e);
    }
}
