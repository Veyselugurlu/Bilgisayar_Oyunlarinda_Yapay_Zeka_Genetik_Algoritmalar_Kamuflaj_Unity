using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using UnityEditor;
using UnityEngine;

/// <summary>
/// Controlled experiments of the lecture (slides 35-37 and the homework), run without frames:
/// every generation is hunted by GeneticAlgorithm.SimulateHunt and bred by GeneticAlgorithm.NextGeneration,
/// i.e. the same code the live scene uses. Every condition is repeated with the same seeds.
/// Menu: Genetik Algoritma / 2. Deneyleri Çalıştır, or batch: -executeMethod ExperimentRunner.RunBatch
/// Output: docs/week06/data/generations.csv (one row per condition x seed x generation).
/// </summary>
public static class ExperimentRunner
{
    public const int Generations = 40;
    public static readonly int[] Seeds = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };
    private const string OutputPath = "docs/week06/data/generations.csv";

    private class Condition
    {
        public string id, group, label;
        public EvolutionSettings settings;
    }

    private static EvolutionSettings Make(HunterRule rule, float mutation = 0.02f, bool selection = true,
                                          bool size = false, bool sizeVisible = false) =>
        new EvolutionSettings
        {
            hunterRule = rule, mutationRate = mutation, selectionEnabled = selection,
            evolveSize = size, sizeAffectsVisibility = sizeVisible
        };

    private static List<Condition> Conditions() => new List<Condition>
    {
        // Slide 35-36: hunter rule and controls
        new Condition { id = "bright",       group = "hunter",   label = "Parlak avcı (parlakları önce avlar)", settings = Make(HunterRule.BrightestFirst) },
        new Condition { id = "dull",         group = "hunter",   label = "Mat avcı (matları önce avlar)",       settings = Make(HunterRule.DullestFirst) },
        new Condition { id = "random",       group = "hunter",   label = "Rastgele avcı",                       settings = Make(HunterRule.Random) },
        new Condition { id = "noselection",  group = "control",  label = "Seçim yok (parlak avcı, ebeveyn rastgele)", settings = Make(HunterRule.BrightestFirst, selection: false) },
        // Homework: different mutation rates, same start conditions
        new Condition { id = "mut0.00",      group = "mutation", label = "Mutasyon 0",    settings = Make(HunterRule.BrightestFirst, 0f) },
        new Condition { id = "mut0.02",      group = "mutation", label = "Mutasyon 0.02", settings = Make(HunterRule.BrightestFirst, 0.02f) },
        new Condition { id = "mut0.10",      group = "mutation", label = "Mutasyon 0.10", settings = Make(HunterRule.BrightestFirst, 0.10f) },
        new Condition { id = "mut0.50",      group = "mutation", label = "Mutasyon 0.50", settings = Make(HunterRule.BrightestFirst, 0.50f) },
        // Challenge: size gene
        new Condition { id = "size_color",   group = "size",     label = "Boyut geni, avcı sadece renge bakar", settings = Make(HunterRule.BrightestFirst, size: true) },
        new Condition { id = "size_visible", group = "size",     label = "Boyut geni, büyükler daha görünür",   settings = Make(HunterRule.BrightestFirst, size: true, sizeVisible: true) },
    };

    [MenuItem("Genetik Algoritma/2. Deneyleri Çalıştır")]
    public static void RunAll()
    {
        var csv = new StringBuilder("condition,group,label,seed,generation,mean_L,std_L,min_L,max_L,mean_r,mean_g,mean_b,mean_s\n");
        foreach (Condition c in Conditions())
        {
            foreach (int seed in Seeds)
            {
                Random.InitState(seed); // same seed -> same initial population for every condition
                List<Genome> population = Enumerable.Range(0, c.settings.populationSize)
                    .Select(_ => GeneticAlgorithm.RandomGenome(c.settings.evolveSize)).ToList();

                for (int gen = 1; gen <= Generations; gen++)
                {
                    csv.Append(Row(c, seed, gen, population));
                    float[] fitness = GeneticAlgorithm.SimulateHunt(population, c.settings);
                    population = GeneticAlgorithm.NextGeneration(population, fitness, c.settings);
                }
            }
        }
        Directory.CreateDirectory(Path.GetDirectoryName(OutputPath));
        File.WriteAllText(OutputPath, csv.ToString(), new UTF8Encoding(false));
        Debug.Log($"GA: experiments written -> {OutputPath}");
    }

    public static void RunBatch()
    {
        int code = 0;
        try { RunAll(); }
        catch (System.Exception e) { Debug.LogException(e); code = 1; }
        EditorApplication.Exit(code); // never leave a batch-mode editor running
    }

    private static string Row(Condition c, int seed, int gen, List<Genome> pop)
    {
        var L = pop.Select(x => x.Luminance).ToList();
        float mean = L.Average();
        float std = Mathf.Sqrt(L.Select(v => (v - mean) * (v - mean)).Average());
        string F(float v) => v.ToString("0.0000", CultureInfo.InvariantCulture);
        return string.Join(",", c.id, c.group, "\"" + c.label + "\"", seed, gen, F(mean), F(std), F(L.Min()), F(L.Max()),
            F(pop.Average(x => x.r)), F(pop.Average(x => x.g)), F(pop.Average(x => x.b)), F(pop.Average(x => x.s))) + "\n";
    }
}
