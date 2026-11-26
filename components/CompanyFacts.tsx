import type { CompanyFact } from "@/lib/companyView";

export default function CompanyFacts({ facts }: { facts: CompanyFact[] }) {
  return (
    <dl className="facts">
      {facts.map(([label, value]) => (
        <div className="fact" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
