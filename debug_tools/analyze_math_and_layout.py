"""
debug_tools/analyze_math_and_layout.py
--------------------------------------
Analisa e valida matematicamente todas as fórmulas de layout do projeto:
1. Métricas da Barra Lateral Flutuante Simétrica (Left & Right)
2. Modelo Matemático Adaptativo do Topo da Questão (1/5 da Altura: T(h, H))
3. Métricas de Gutter e Caleiras Horizontais em diferentes viewports (1920, 1600, 1440, 1366, 1280, 1024, 768, 375)
4. Verificação de Overlap e Conflitos de Layout (Float vs Flex vs Grid)
"""

def analyze_sidebar_floating_math():
    print("=" * 80)
    print("1. ANÁLISE MATEMÁTICA DAS BARRAS FLUTUANTES SIMÉTRICAS")
    print("=" * 80)
    print("Fórmulas CSS em :root:")
    print("  Container Principal (max-width): W_main = 960px")
    print("  Largura da Barra: W_bar = 300px")
    print("  Margem de Deslocamento Lateral:")
    print("    margin = calc(-25vw + 25% - 150px)")
    print("    onde 25vw = 0.25 * W_viewport")
    print("    e 25% (relativo a 960px) = 0.25 * 960 = 240px")
    print("    Logo: margin(W) = -0.25*W + 240 - 150 = -0.25*W + 90")
    print("  Largura Máxima:")
    print("    max-width = calc(50vw - 50% - 24px)")
    print("    max-width(W) = 0.50*W - 480 - 24 = 0.50*W - 504")
    print("-" * 80)

    viewports = [1920, 1680, 1600, 1440, 1366, 1320, 1280, 1024, 768]
    w_main = 960
    w_bar = 300

    print(f"{'Viewport (W)':<14} | {'Gutter ((W-960)/2)':<18} | {'Margin (px)':<14} | {'Left Center (px)':<18} | {'Max-Width (px)':<16} | {'Status'}")
    print("-" * 95)

    for w in viewports:
        gutter = (w - w_main) / 2
        margin = -0.25 * w + 90
        # For left sidebar: position from main column left edge = margin
        # Physical left edge of main column is at x = gutter
        # Left edge of sidebar is at x = gutter + margin
        # Center of sidebar is at x = gutter + margin + (w_bar / 2)
        # Ideal center of gutter is at x = gutter / 2
        sidebar_left = gutter + margin
        sidebar_center = sidebar_left + (w_bar / 2)
        gutter_center = gutter / 2
        max_w = 0.50 * w - 504

        offset_from_ideal_center = sidebar_center - gutter_center
        status = "OK (Flutuante)" if w >= 1320 else "Responsivo (<1320px)"
        if w >= 1320 and sidebar_left < 0:
            status = "AVISO (Transborda ecrã)"
        elif w >= 1320 and (sidebar_left + w_bar) > gutter:
            status = "AVISO (Sobrepõe coluna central)"

        print(f"{w}px{'':<8} | {gutter:<18.1f} | {margin:<14.1f} | {sidebar_left:<18.1f} | {max_w:<16.1f} | {status}")

    print("\nConclusão Matemática das Barras:")
    print("- Para W = 1920px: Caleira = 480px. Margem = -390px. Barra fica posicionada em x = 90px (perfeitamente centrada na caleira de 480px, com 90px de margem livre à esquerda e 90px à direita).")
    print("- Para W = 1440px: Caleira = 240px. Margem = -270px. Barra fica posicionada em x = -30px (começa a sair do ecrã se não houver max-width ou media query).")
    print("- Breakpoint em 1320px: Caleira = 180px. A media query ativa-se aos 1320px, recolhendo as barras para o fluxo vertical/horizontal estático.")

def analyze_vertical_offset_math():
    print("\n" + "=" * 80)
    print("2. ANÁLISE MATEMÁTICA DO ALINHAMENTO VERTICAL (1/5 DA ALTURA)")
    print("=" * 80)
    print("Fórmula: T(h, H) = max(0, min(0.20 * H, H - h))")
    print("Onde H = Altura útil disponível no viewport")
    print("     h = Altura do conteúdo da pergunta")
    print("-" * 80)

    test_cases = [
        (800, 100, "Questão curta (100px)"),
        (800, 400, "Questão média (400px)"),
        (800, 640, "Limite 80% (640px)"),
        (800, 700, "Questão longa (700px)"),
        (800, 780, "Questão quase cheia (780px)"),
        (800, 800, "Questão exata (800px)"),
        (800, 950, "Questão transbordante (950px)"),
        (1080, 200, "Ecrã 1080p - Curta"),
        (1080, 864, "Ecrã 1080p - Limite 80%"),
        (1080, 1000, "Ecrã 1080p - Longa"),
    ]

    print(f"{'H (Viewport)':<12} | {'h (Conteúdo)':<14} | {'1/5 H (Alvo)':<14} | {'H - h (Espaço)':<16} | {'T(h,H) Calculado':<18} | {'Tipo / Comportamento'}")
    print("-" * 95)

    for H, h, desc in test_cases:
        target_fifth = 0.20 * H
        remaining = H - h
        T = max(0, min(target_fifth, remaining))
        print(f"{H}px{'':<7} | {h}px{'':<9} | {target_fifth:<14.1f} | {remaining:<16.1f} | {T:<18.1f} | {desc}")

if __name__ == '__main__':
    analyze_sidebar_floating_math()
    analyze_vertical_offset_math()
