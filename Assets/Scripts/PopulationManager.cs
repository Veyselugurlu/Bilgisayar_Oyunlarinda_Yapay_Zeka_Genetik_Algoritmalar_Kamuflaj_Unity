using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.InputSystem;

/// <summary>
/// Runs the evolutionary loop in the scene: spawns the population, lets the player (or the automatic
/// hunter) catch individuals, and builds the next generation when the generation clock runs out.
/// </summary>
public class PopulationManager : MonoBehaviour
{
    [SerializeField] private DNA personPrefab;
    [SerializeField] private Camera sceneCamera;
    [SerializeField] private EvolutionSettings settings = new EvolutionSettings();

    [Header("Hunter")]
    [Tooltip("ON: the computer hunts by the rule in Settings. OFF: you hunt with the left mouse button.")]
    [SerializeField] private bool automaticHunter;

    [Header("Reproducibility")]
    [SerializeField] private bool useFixedSeed = true;
    [SerializeField] private int fixedSeed = 1;
    [SerializeField, Min(0f)] private float spawnMargin = 0.6f;

    private readonly List<DNA> population = new List<DNA>();
    private readonly List<float> meanLuminanceHistory = new List<float>();
    private float elapsed;
    private float nextAutoHunt;
    private int generation = 1;

    public int Generation => generation;
    public float MeanLuminance => population.Count == 0 ? 0f : population.Average(d => d.Genome.Luminance);
    public EvolutionSettings Settings => settings;
    public void SetAutomaticHunter(bool on) => automaticHunter = on;

    private void Start()
    {
        if (sceneCamera == null) sceneCamera = Camera.main;
        if (personPrefab == null || sceneCamera == null)
        {
            Debug.LogError("PopulationManager: assign the Person prefab and the scene camera in the Inspector.", this);
            enabled = false;
            return;
        }
        if (useFixedSeed) Random.InitState(fixedSeed);

        for (int i = 0; i < settings.populationSize; i++)
            Spawn(GeneticAlgorithm.RandomGenome(settings.evolveSize));

        nextAutoHunt = settings.huntInterval;
        meanLuminanceHistory.Add(MeanLuminance);
        Debug.Log($"Generation {generation}: mean L = {MeanLuminance:0.000}");
    }

    private void Update()
    {
        elapsed += Time.deltaTime;

        if (automaticHunter) AutoHunt();
        else HandleClick();

        if (elapsed >= settings.trialTime)
            BreedNewPopulation();
    }

    /// <summary>Left click: find the individual under the cursor (no Raycast needed in 2D, a point query is enough).</summary>
    private void HandleClick()
    {
        if (Mouse.current == null || !Mouse.current.leftButton.wasPressedThisFrame) return;

        Vector2 p = Mouse.current.position.ReadValue();
        // Screen pixels -> world units; z is the distance from the camera to the sprites' plane (z = 0)
        Vector3 world = sceneCamera.ScreenToWorldPoint(new Vector3(p.x, p.y, -sceneCamera.transform.position.z));
        Collider2D hit = Physics2D.OverlapPoint((Vector2)world);
        if (hit != null && hit.TryGetComponent(out DNA target))
            target.Kill(elapsed);
    }

    /// <summary>Automatic hunter: one catch every huntInterval seconds, chosen by the hunter rule.</summary>
    private void AutoHunt()
    {
        while (elapsed >= nextAutoHunt && nextAutoHunt < settings.trialTime)
        {
            var genomes = population.Select(d => d.Genome).ToList();
            var alive = population.Select(d => !d.IsDead).ToList();
            int prey = GeneticAlgorithm.PickPrey(genomes, alive, settings);
            if (prey >= 0) population[prey].Kill(nextAutoHunt);
            nextAutoHunt += settings.huntInterval;
        }
    }

    /// <summary>Selection + crossover + mutation + replacement (lecture slide "Nesil geçişi").</summary>
    private void BreedNewPopulation()
    {
        // 1. Survivors get the full trial time as fitness
        foreach (DNA d in population) d.FinishGeneration(settings.trialTime);

        // 2-4. Rank by fitness, take the best part as parents and keep the CHILD GENOMES first
        var genomes = population.Select(d => d.Genome).ToList();
        var fitness = population.Select(d => d.SurvivalTime).ToList();
        List<Genome> children = GeneticAlgorithm.NextGeneration(genomes, fitness, settings);

        // 5-6. Only then remove the old generation
        foreach (DNA old in population) Destroy(old.gameObject);
        population.Clear();

        // 7. Spawn the new generation
        foreach (Genome genes in children) Spawn(genes);

        // 8. Restart the generation clock
        elapsed = 0f;
        nextAutoHunt = settings.huntInterval;
        generation++;
        meanLuminanceHistory.Add(MeanLuminance);
        Debug.Log($"Generation {generation}: mean L = {MeanLuminance:0.000}");
    }

    private void Spawn(Genome genome)
    {
        DNA person = Instantiate(personPrefab, RandomPosition(), Quaternion.identity);
        person.Initialize(genome);
        population.Add(person);
    }

    /// <summary>Random point inside the visible area; uses the camera aspect so it works on any screen size.</summary>
    private Vector3 RandomPosition()
    {
        float halfHeight = sceneCamera.orthographicSize - spawnMargin;
        float halfWidth = sceneCamera.orthographicSize * sceneCamera.aspect - spawnMargin;
        return new Vector3(Random.Range(-halfWidth, halfWidth), Random.Range(-halfHeight, halfHeight), 0f);
    }

    private void OnGUI()
    {
        var style = new GUIStyle(GUI.skin.box) { alignment = TextAnchor.UpperLeft, fontSize = 16 };
        string hunter = automaticHunter ? $"Otomatik avcı ({settings.hunterRule})" : "Avcı: sen (sol tık)";
        string recent = string.Join("  ", meanLuminanceHistory.Skip(Mathf.Max(0, meanLuminanceHistory.Count - 8))
            .Select(v => v.ToString("0.00")));
        GUI.Box(new Rect(10, 10, 600, 104),
            $"Nesil: {generation}    Süre: {elapsed:0.0} / {settings.trialTime:0} s\n" +
            $"Canlı: {population.Count(d => !d.IsDead)} / {population.Count}    Ortalama parlaklık L: {MeanLuminance:0.000}\n" +
            $"{hunter}    Mutasyon: {settings.mutationRate:0.00}\n" +
            $"Son nesillerin L değeri: {recent}", style);
    }
}
