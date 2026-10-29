import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <section className="page-section">
      <div className="narrow">
        <p className="eyebrow">About the publication</p>
        <h1 className="page-title">A literary home for every kind of childhood story.</h1>
        <p className="lead">Little Bird, Heavy Skies publishes fiction that can be funny, imaginative, educational, culturally grounded, hopeful, or inspired by global issues affecting children.</p>
        <div className="panel" style={{ marginTop: 30 }}>
          <h2>What the name means</h2>
          <p>The <strong>little bird</strong> represents a child: curious, developing, and full of possibility. The <strong>heavy skies</strong> represent circumstances that can shape childhood—war, poverty, displacement, climate events, discrimination, family disruption, and other pressures beyond a child’s control.</p>
          <p>Not every story is sad. A sky can also clear. The publication includes humor, fantasy, friendship, culture, adventure, and the ordinary surprises of growing up.</p>
          <h2>Editorial principles</h2>
          <p>We protect children’s dignity, avoid unnecessary graphic detail, distinguish fiction from factual reporting, respect cultures, and do not present children only as helpless victims. Stories submitted by contributors are reviewed before publication.</p>
        </div>
      </div>
    </section>
  );
}
