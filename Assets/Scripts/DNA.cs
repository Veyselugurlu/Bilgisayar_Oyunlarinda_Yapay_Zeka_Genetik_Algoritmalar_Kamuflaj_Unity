using UnityEngine;

/// <summary>
/// One individual (Person prefab): stores its genome, shows it as a coloured circle and records
/// how long it survived. Hunting input is handled by PopulationManager, not here.
/// </summary>
[RequireComponent(typeof(SpriteRenderer), typeof(Collider2D))]
public class DNA : MonoBehaviour
{
    public float r, g, b;
    public float s = 1f;

    public bool IsDead { get; private set; }
    public float SurvivalTime { get; private set; } // fitness
    public Genome Genome => new Genome(r, g, b, s);

    private SpriteRenderer spriteRenderer;
    private Collider2D hitCollider;
    private Vector3 originalScale;

    private void Awake()
    {
        spriteRenderer = GetComponent<SpriteRenderer>();
        hitCollider = GetComponent<Collider2D>();
        originalScale = transform.localScale;
    }

    /// <summary>
    /// Called by PopulationManager right after Instantiate. Using an explicit method instead of Start()
    /// guarantees the genes are set before the individual is shown, hunted or evaluated.
    /// </summary>
    public void Initialize(Genome genome)
    {
        r = genome.r;
        g = genome.g;
        b = genome.b;
        s = genome.s;
        spriteRenderer.color = genome.Color;
        transform.localScale = originalScale * s; // phenotype of the size gene (challenge)
        IsDead = false;
        SurvivalTime = 0f;
        spriteRenderer.enabled = true;
        hitCollider.enabled = true;
    }

    /// <summary>The hunter caught this individual at elapsedTime seconds.</summary>
    public void Kill(float elapsedTime)
    {
        if (IsDead) return; // an individual cannot be hunted twice
        IsDead = true;
        SurvivalTime = elapsedTime;
        HideFromHunter();
    }

    /// <summary>End of the generation: individuals that were never caught survived the whole trial.</summary>
    public void FinishGeneration(float duration)
    {
        if (!IsDead) SurvivalTime = duration;
    }

    private void HideFromHunter()
    {
        spriteRenderer.enabled = false;
        hitCollider.enabled = false; // also removes it from Physics2D.OverlapPoint
    }
}
