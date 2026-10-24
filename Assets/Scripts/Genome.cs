using UnityEngine;

/// <summary>
/// Chromosome of one individual: three colour genes (r, g, b) and an optional size gene (s).
/// This is the genotype; DNA.cs turns it into the phenotype (sprite colour and scale).
/// </summary>
[System.Serializable]
public struct Genome
{
    public const float MinSize = 0.5f;
    public const float MaxSize = 1.5f;

    public float r, g, b, s;

    public Genome(float r, float g, float b, float s = 1f)
    {
        this.r = Mathf.Clamp01(r);
        this.g = Mathf.Clamp01(g);
        this.b = Mathf.Clamp01(b);
        this.s = Mathf.Clamp(s, MinSize, MaxSize);
    }

    /// <summary>Relative luminance (Rec. 709), the brightness measure used in the lecture: L = 0.2126r + 0.7152g + 0.0722b.</summary>
    public float Luminance => 0.2126f * r + 0.7152f * g + 0.0722f * b;

    public Color Color => new Color(r, g, b, 1f); // r, g, b order matters: new Color(r, b, g) swaps two channels

    public override string ToString() => $"[{r:0.00}, {g:0.00}, {b:0.00} | s={s:0.00}]";
}
