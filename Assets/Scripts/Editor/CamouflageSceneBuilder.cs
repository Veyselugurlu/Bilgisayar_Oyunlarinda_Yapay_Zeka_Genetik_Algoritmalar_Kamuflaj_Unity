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
        Build();
        EditorApplication.Exit(0);
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

        DNA prefab = PrefabUtility.SaveAsPrefabAsset(go, PrefabPath).GetComponent<DNA>();
        Object.DestroyImmediate(go);
        return prefab;
    }

    private static void CreateScene(DNA prefab)
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

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

        Directory.CreateDirectory("Assets/Scenes");
        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };

        if (File.Exists("Assets/Scenes/SampleScene.unity")) AssetDatabase.DeleteAsset("Assets/Scenes/SampleScene.unity");
    }
}
