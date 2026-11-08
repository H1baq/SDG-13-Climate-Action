# Problem Statement

## One-sentence version (for slides)

Kenya's carbon credit market has no transparent, tamper-proof way to track credits from issuance to retirement. This allows double-counting, hides how revenue is shared, and leaves communities unable to check that they receive the share the law guarantees them.

## Full version

Kenya is Africa's leading generator of carbon credits. At the 2022 launch of the Africa Carbon Markets Initiative, the President stated that Kenya accounted for over 20% of Africa's credit volumes over the previous five years (Ruto, 2022). These credits come from projects such as clean cookstoves, forest conservation and rangeland management. However, the voluntary carbon market (VCM) that buys most of them is losing trust. Reported transaction volume fell by 56% in 2023, and total value fell to US$723 million (Forest Trends' Ecosystem Marketplace, 2024). This followed evidence that many credits overstate their climate benefit. A joint investigation by *The Guardian*, *Die Zeit* and SourceMaterial reported that more than 90% of rainforest offsets certified by the largest standard were likely "phantom credits" (Greenfield, 2023). Peer-reviewed studies have found that most forest-conservation projects did not reduce deforestation as claimed (West et al., 2023), and that cookstove projects, a major credit type in Kenya, were over-credited roughly ten-fold (Gill-Wiehl et al., 2024).

Kenyan projects have also been criticised over how they treat communities. Survival International's *Blood Carbon* report questioned whether communities on the Northern Kenya Rangelands carbon project gave free, prior and informed consent, and whether they benefit fairly (Counsell, 2023). Kenya's President has said that up to 80% of the value of some carbon credits is captured by intermediaries, "leaving only a fraction for the communities undertaking the actual hard work on the ground" (Ruto, 2022). In response, the Climate Change (Amendment) Act, 2023 requires land-based projects to give communities at least 40%, and non-land-based projects at least 25%, of the previous year's aggregate earnings. It also requires community development agreements to be recorded in a new National Carbon Registry (Climate Change Act, Cap. 387A, ss. 23E–23G).

These problems persist because credit records sit in separate, centrally controlled registries that buyers, regulators and communities cannot independently check. The same tonne of CO₂e can be claimed more than once, which is known as **double-counting** (Schneider et al., 2019). Buyers cannot trace a credit from its origin to its retirement. Communities cannot see the sales revenue on which their share is calculated. Earlier attempts to bring credits on-chain showed the risk of joining two ledgers without coordination: in 2022, Verra stopped the tokenisation of retired credits because it created ambiguity about which credits had actually been used (DLA Piper, 2022).

This project proposes **KaboniChain**, a blockchain platform that:

- tokenises verified carbon credits;
- records each credit's full life cycle on a public ledger;
- permanently burns credits when they are retired, which prevents double-counting by design;
- pays each community's share automatically, at the moment of sale, through a smart contract.

The project supports **SDG 13 (Climate Action)**, in particular **Target 13.2**: "Integrate climate change measures into national policies, strategies and planning" (United Nations, 2015). It does so by putting Kenya's new carbon-market law into operation in software, and by making climate finance flows verifiable.

## Objectives

1. Tokenise verified carbon credits so that 1 token = 1 tonne of CO₂e.
2. Prevent double-counting by burning tokens when credits are retired.
3. Provide a public registry so that anyone can trace a credit from project to retirement.
4. Pay communities their share automatically at the moment of sale, at or above a legal minimum.
5. Restrict credit issuance to independent verifiers, and stop developers from verifying their own projects.

## References

The full reference list, in APA 7th edition, is in [`report.md`](report.md#references). The sources cited above are:

- Climate Change Act, Cap. 387A (Kenya), as amended by the Climate Change (Amendment) Act, No. 9 of 2023. http://kenyalaw.org/kl/fileadmin/pdfdownloads/Acts/2023/TheClimateChange_Amendment_Act_No.9of2023.pdf
- Counsell, S. (2023). *Blood Carbon: How a carbon offset scheme makes millions from Indigenous land in Northern Kenya*. Survival International. https://assets.survivalinternational.org/documents/2466/Blood_Carbon_Report.pdf
- DLA Piper. (2022, September). *Verra contemplates future of crypto instruments and VCUs*. https://www.dlapiper.com/en/insights/publications/2022/09/verra-contemplates-future-of-crypto-instruments-and-vcus
- Forest Trends' Ecosystem Marketplace. (2024). *State of the voluntary carbon market 2024: On the path to maturity*. https://www.ecosystemmarketplace.com/publications/2024-state-of-the-voluntary-carbon-markets-sovcm/
- Gill-Wiehl, A., Kammen, D. M., & Haya, B. K. (2024). Pervasive over-crediting from cookstove offset methodologies. *Nature Sustainability, 7*(2), 191–202. https://doi.org/10.1038/s41893-023-01259-6
- Greenfield, P. (2023, January 18). Revealed: More than 90% of rainforest carbon offsets by biggest provider are worthless, analysis shows. *The Guardian*. https://www.theguardian.com/environment/2023/jan/18/revealed-forest-carbon-offsets-biggest-provider-worthless-verra-aoe
- Ruto, W. S. (2022, November 7). *Remarks at the launch of the Africa Carbon Markets Initiative (ACMI), COP27* [Speech]. Sharm el-Sheikh, Egypt. https://president.go.ke/wp-content/uploads/Remarks-by-H.E.-Hon.-William-Ruto-at-the-launch-of-African-Carbon-Initiative-ACMI-at-COP27-1.pdf
- Schneider, L., Duan, M., Stavins, R., Kizzier, K., Broekhoff, D., Jotzo, F., Winkler, H., Lazarus, M., Howard, A., & Hood, C. (2019). Double counting and the Paris Agreement rulebook. *Science, 366*(6462), 180–183. https://doi.org/10.1126/science.aay8750
- United Nations. (2015). *Transforming our world: The 2030 Agenda for Sustainable Development* (A/RES/70/1). https://sdgs.un.org/2030agenda
- West, T. A. P., Wunder, S., Sills, E. O., Börner, J., Rifai, S. W., Neidermeier, A. N., Frey, G. P., & Kontoleon, A. (2023). Action needed to make carbon offsets from forest conservation work for climate change mitigation. *Science, 381*(6660), 873–877. https://doi.org/10.1126/science.ade3535
