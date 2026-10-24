using System.Collections.Generic;
using System.Linq;
using UnityEngine;

/// <summary>Who the hunter catches first.</summary>
public enum HunterRule
{
    BrightestFirst, // bright individuals are seen first -> dull colours should survive
    DullestFirst,   // dull individuals are seen first -> bright colours should survive
    Random          // colour does not matter -> no directional evolution expected
}

/// <summary>
/// Settings of one evolutionary run. The live scene (PopulationManager) and the batch experiments
/// (ExperimentRunner) use the same settings and the same operators below.
/// </summary>
[System.Serializable]
public class EvolutionSettings
{
    [Min(2)] public int populationSize = 10;
    [Min(1f)] public float trialTime = 10f;                  // T: length of one generation in seconds
    [Range(0.1f, 1f)] public float selectedFraction = 0.5f;  // best part of the ranking that may become parents
    [Range(0f, 1f)] public float mutationRate = 0.02f;       // probability PER GENE of drawing a new random value
    public bool selectionEnabled = true;                     // false = control: parents drawn from the whole population
    public bool evolveSize;                                  // challenge: the 4th gene s changes the sprite scale

    [Header("Automatic hunter")]
    public HunterRule hunterRule = HunterRule.BrightestFirst;
    [Min(0.1f)] public float huntInterval = 1.5f;            // one catch every huntInterval seconds
    public bool sizeAffectsVisibility;                       // challenge: larger individuals are easier to see
}

/// <summary>Selection, crossover and mutation (one generation of the GA).</summary>
public static class GeneticAlgorithm
{
    public static float RandomSize() => Random.Range(Genome.MinSize, Genome.MaxSize);

    public static Genome RandomGenome(bool evolveSize) =>
        new Genome(Random.value, Random.value, Random.value, evolveSize ? RandomSize() : 1f);

    /// <summary>Uniform crossover for one gene, then mutation with probability mutationRate.</summary>
    public static float InheritOrMutate(float mother, float father, float mutationRate)
    {
        float inherited = Random.value < 0.5f ? mother : father; // each gene from either parent, independently
        if (Random.value < mutationRate)
            return Random.value;                                   // mutation: a brand-new value in [0, 1]
        return inherited;
    }

    public static Genome Breed(Genome mother, Genome father, EvolutionSettings settings)
    {
        float r = InheritOrMutate(mother.r, father.r, settings.mutationRate);
        float g = InheritOrMutate(mother.g, father.g, settings.mutationRate);
        float b = InheritOrMutate(mother.b, father.b, settings.mutationRate);
        float s = 1f;
        if (settings.evolveSize)
        {
            s = Random.value < 0.5f ? mother.s : father.s;
            if (Random.value < settings.mutationRate) s = RandomSize();
        }
        return new Genome(r, g, b, s);
    }

    /// <summary>
    /// Builds exactly populationSize children from the fittest individuals.
    /// fitness[i] is the survival time of genomes[i] (survivors get trialTime).
    /// </summary>
    public static List<Genome> NextGeneration(IReadOnlyList<Genome> genomes, IReadOnlyList<float> fitness,
                                              EvolutionSettings settings)
    {
        // Shuffle first so that equal fitness values (all survivors) are ordered randomly;
        // OrderByDescending is a stable sort and keeps that random order among ties.
        List<int> ranked = Enumerable.Range(0, genomes.Count)
            .OrderBy(_ => Random.value)
            .OrderByDescending(i => fitness[i])
            .ToList();

        int k = settings.selectionEnabled
            ? Mathf.Clamp(Mathf.CeilToInt(settings.populationSize * settings.selectedFraction), 2, ranked.Count)
            : ranked.Count; // control condition: every individual can become a parent

        var children = new List<Genome>(settings.populationSize);
        for (int i = 0; i < settings.populationSize; i++)
        {
            Genome mother = genomes[ranked[Random.Range(0, k)]];
            Genome father = genomes[ranked[Random.Range(0, k)]];
            children.Add(Breed(mother, father, settings));
        }
        return children;
    }

    /// <summary>How visible an individual is to the automatic hunter.</summary>
    public static float Visibility(Genome genome, EvolutionSettings settings) =>
        settings.sizeAffectsVisibility ? genome.Luminance * genome.s : genome.Luminance;

    /// <summary>Index of the living individual the automatic hunter catches next.</summary>
    public static int PickPrey(IReadOnlyList<Genome> genomes, IReadOnlyList<bool> alive, EvolutionSettings settings)
    {
        var candidates = Enumerable.Range(0, genomes.Count).Where(i => alive[i]).ToList();
        if (candidates.Count == 0) return -1;
        switch (settings.hunterRule)
        {
            case HunterRule.BrightestFirst:
                return candidates.OrderByDescending(i => Visibility(genomes[i], settings)).First();
            case HunterRule.DullestFirst:
                return candidates.OrderBy(i => Visibility(genomes[i], settings)).First();
            default:
                return candidates[Random.Range(0, candidates.Count)];
        }
    }

    /// <summary>
    /// Plays one generation with the automatic hunter, without frames: a catch every huntInterval seconds
    /// until trialTime. Returns the survival time (fitness) of every individual. The live scene produces the
    /// same values in real time.
    /// </summary>
    public static float[] SimulateHunt(IReadOnlyList<Genome> genomes, EvolutionSettings settings)
    {
        var fitness = new float[genomes.Count];
        var alive = Enumerable.Repeat(true, genomes.Count).ToList();
        for (float t = settings.huntInterval; t < settings.trialTime; t += settings.huntInterval)
        {
            int prey = PickPrey(genomes, alive, settings);
            if (prey < 0) break;
            alive[prey] = false;
            fitness[prey] = t;
        }
        for (int i = 0; i < genomes.Count; i++)
            if (alive[i]) fitness[i] = settings.trialTime; // survivors get the full trial time
        return fitness;
    }
}
