using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

/// <summary>
/// Rebuilds the lecture setup with one click (menu: Genetik Algoritma / 1. Sahneyi ve Prefab'ı Kur):
/// the Person prefab (SpriteRenderer + CircleCollider2D + DNA) and CamouflageScene
/// (Main Camera + PopulationManager). The lecture ZIP only contained C# files, so the scene and
/// prefab are created here.
/// </summary>
public static class CamouflageSceneBuilder
{
    private const string SpritePath = "Assets/Sprites/Circle.png";
    private const string PrefabPath = "Assets/Prefabs/Person.prefab";
    public const string ScenePath = "Assets/Scenes/CamouflageScene.unity";
    private const string UnlitMaterialPath = "Packages/com.unity.render-pipelines.universal/Runtime/Materials/Sprite-Unlit-Default.mat";
    private static readonly Color Background = new Color(0.10f, 0.11f, 0.13f); // dark ground: bright colours stand out

    [MenuItem("Genetik Algoritma/1. Sahneyi ve Prefab'ı Kur")]
    public static void Build()
    {
        Sprite circle = ImportCircleSprite();
        DNA prefab = CreatePersonPrefab(circle);
        CreateScene(prefab);
        Debug.Log("GA: scene and prefab ready -> " + ScenePath);
    }

    /// <summary>Batch-mode entry point (-executeMethod CamouflageSceneBuilder.BuildBatch).</summary>
    public static void BuildBatch()
    {
        int code = 0;
        try { Build(); }
        catch (System.Exception e) { Debug.LogException(e); code = 1; }
        EditorApplication.Exit(code);
    }

    [MenuItem("Genetik Algoritma/3. Windows Build Al")]
    public static void BuildPlayer() => TryBuildPlayer();

    private static bool TryBuildPlayer()
    {
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes = new[] { ScenePath },
            locationPathName = "Builds/GA-Kamuflaj/GA-Kamuflaj.exe",
            target = BuildTarget.StandaloneWindows64,
            options = BuildOptions.None
        });
        Debug.Log("GA_BUILD_RESULT " + report.summary.result);
        return report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded;
    }

    public static void BuildSceneAndPlayerBatch()
    {
        int code = 0;
        try { Build(); if (!TryBuildPlayer()) code = 1; }
        catch (System.Exception e) { Debug.LogException(e); code = 1; }
        EditorApplication.Exit(code);
    }

    private static Sprite ImportCircleSprite()
    {
        Directory.CreateDirectory("Assets/Sprites");
        if (!File.Exists(SpritePath))
        {
            // Same circle texture that 2D Object > Sprites > Circle uses
            string source = Path.Combine(EditorApplication.applicationContentsPath,
                "Resources/PackageManager/BuiltInPackages/com.unity.2d.sprite/Editor/ObjectMenuCreation/DefaultAssets/Textures/Circle.png");
            File.Copy(source, SpritePath);
            AssetDatabase.ImportAsset(SpritePath);
        }
        var importer = (TextureImporter)AssetImporter.GetAtPath(SpritePath);
        importer.textureType = TextureImporterType.Sprite;
        importer.spriteImportMode = SpriteImportMode.Single;
        importer.spritePixelsPerUnit = 256; // 256 px texture -> 1 world unit
        importer.SaveAndReimport();
        return AssetDatabase.LoadAssetAtPath<Sprite>(SpritePath);
    }

    private static DNA CreatePersonPrefab(Sprite circle)
    {
        Directory.CreateDirectory("Assets/Prefabs");
        var go = new GameObject("Person");
        go.transform.localScale = new Vector3(0.4f, 0.4f, 1f);

        var renderer = go.AddComponent<SpriteRenderer>();
        renderer.sprite = circle;
        // Unlit: the colour on screen is exactly the colour in the genes (no 2D lighting needed)
        var unlit = AssetDatabase.LoadAssetAtPath<Material>(UnlitMaterialPath);
        if (unlit != null) renderer.sharedMaterial = unlit;

        go.AddComponent<CircleCollider2D>();
        go.AddComponent<DNA>();

        PrefabUtility.SaveAsPrefabAsset(go, PrefabPath);
        Object.DestroyImmediate(go);
        AssetDatabase.ImportAsset(PrefabPath, ImportAssetOptions.ForceUpdate);
        // Reference the asset loaded from disk; the object returned by SaveAsPrefabAsset may not serialize as a reference.
        DNA prefab = AssetDatabase.LoadAssetAtPath<GameObject>(PrefabPath).GetComponent<DNA>();
        if (prefab == null) throw new System.InvalidOperationException("Person prefab has no DNA component: " + PrefabPath);
        return prefab;
    }

    private static void CreateScene(DNA prefab)
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        // NewScene unloads unused assets, so the prefab must be (re)loaded after it
        prefab = AssetDatabase.LoadAssetAtPath<GameObject>(PrefabPath).GetComponent<DNA>();

        var cameraGo = new GameObject("Main Camera") { tag = "MainCamera" };
        var camera = cameraGo.AddComponent<Camera>();
        camera.orthographic = true;
        camera.orthographicSize = 5f;
        camera.transform.position = new Vector3(0f, 0f, -10f);
        camera.clearFlags = CameraClearFlags.SolidColor;
        camera.backgroundColor = Background;

        var managerGo = new GameObject("PopulationManager");
        var manager = managerGo.AddComponent<PopulationManager>();
        var so = new SerializedObject(manager);
        so.FindProperty("personPrefab").objectReferenceValue = prefab;
        so.FindProperty("sceneCamera").objectReferenceValue = camera;
        so.ApplyModifiedPropertiesWithoutUndo();
        if (so.FindProperty("personPrefab").objectReferenceValue == null)
            throw new System.InvalidOperationException("PopulationManager.personPrefab could not be assigned");
        managerGo.AddComponent<DemoRecorder>(); // inactive unless the build is started with demo arguments

        Directory.CreateDirectory("Assets/Scenes");
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };

        if (File.Exists("Assets/Scenes/SampleScene.unity")) AssetDatabase.DeleteAsset("Assets/Scenes/SampleScene.unity");
    }
}
