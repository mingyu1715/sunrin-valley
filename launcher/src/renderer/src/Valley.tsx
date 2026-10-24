function Tree({ x, y, size = 1, light = false }: { x: number; y: number; size?: number; light?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <path fill="#658c53" opacity=".17" d="M-28 8h64v10h-64z" />
    <path fill="#806846" d="M-5-24h12v40H-5z" /><path fill="#ad8150" d="M-5-20h4v34h-4z" />
    <path fill={light ? '#86a964' : '#496d49'} d="M-12-88h24v12h16v12h10v32H26v14H-26v-14h-12v-32h10v-12h16z" />
    <path fill={light ? '#a5ba77' : '#668955'} d="M-12-88h24v12h12v12h-8v10H-4v12h-28v-22h8v-12h12z" />
    <path fill={light ? '#c4ce8e' : '#84a267'} d="M-12-80H4v8h-16zm-12 16h12v8h-12z" />
  </g>
}

function Pine({ x, y, size = 1 }: { x: number; y: number; size?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${size})`}>
    <path fill="#8b7651" d="M-4-40h8v48h-8z" />
    <path fill="#557d58" d="M-4-112h8v16h8v16h8v12h-8v8h16v16h12v16h-80v-16h12v-16h16v-8h-8v-12h8v-16h8z" />
    <path fill="#769567" d="M-4-112h8v28H-8v20h-8v20h-16v12h-8v-12h12v-16h16v-8h-8v-12h8v-16h8z" />
  </g>
}

function Flower({ x, y, color = '#f4d99a' }: { x: number; y: number; color?: string }) {
  return <g transform={`translate(${x} ${y})`}><path fill="#73905a" d="M0 0h3v12H0zm-5 5h5v3h-5z" /><path fill={color} d="M-3-6h8v3h3v6H5v3h-8V3h-3v-6h3z" /><path fill="#b28a51" d="M0-2h3v4H0z" /></g>
}

export default function Valley() {
  return <svg className="valley-scene" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true" shapeRendering="crispEdges">
    <defs>
      <linearGradient id="sky" x2="0" y2="1"><stop stopColor="#edf0d9" /><stop offset="1" stopColor="#f6e8bc" /></linearGradient>
      <linearGradient id="grass" x2="0" y2="1"><stop stopColor="#a5b879" /><stop offset="1" stopColor="#829f64" /></linearGradient>
    </defs>
    <path fill="url(#sky)" d="M0 0h1200v800H0z" />
    <path fill="#f7e4a7" d="M923 92h64v12h16v64h-16v12h-64v-12h-16v-64h16z" />
    <g fill="#fbf6df" opacity=".85">
      <path d="M61 144h44v-12h64v12h28v12h32v16H35v-16h26zm166-45h32V87h60v12h28v20H205V99zm715 149h36v-16h52v16h44v12h20v16H918v-16h24z" />
      <path d="M1039 82h32V70h64v12h36v16h29v16h-188V98h27zM9 289h28v-12h64v12h36v20H9z" />
    </g>
    <path fill="#c6cf9f" d="M0 361h44v-25h45v-25h56v-28h53v28h43v25h53v29h71v-18h41v-27h41v-27h55v-20h51v20h48v28h51v27h48v26h52v-21h51v-32h47v-23h50v-24h49v24h51v24h40v33h50v23h64v-22h47v-23h56v-25h64v25h45v25h58v140H0z" />
    <path fill="#b1c18e" d="M0 409h45v-18h56v-20h47v-21h62v21h58v22h61v21h71v-21h63v-20h61v20h68v20h74v-30h62v-25h62v-20h74v20h60v25h63v24h64v-21h66v-24h65v24h66v21h53v142H0z" />
    <g fill="#99b17e"><path d="M0 427h80v-10h73v12h78v-8h86v23h75v-14h99v18h114v-19h103v12h92v-17h103v11h98v-16h99v12h100v369H0z" /></g>
    <path fill="url(#grass)" d="M0 480h123v-12h127v8h103v15h113v-7h132v-13h138v11h115v-12h114v13h135v-9h100v326H0z" />
    <path fill="#bdc493" d="M0 544h92v-8h119v11h111v-8h80v12h101v-8h153v10h116v-10h154v9h128v-13h146v17H0z" />
    <path fill="#e4d2a3" d="M823 469h27v55h-12v33h-28v29h-42v32h-65v31h-97v29H468v35H257v32H0v55h448v-25h180v-33h100v-32h80v-35h57v-44h34v-56h-10v-51h-39v-55z" />
    <path fill="#cfb98b" d="M0 779h258v-32h213v-35h137v-30h96v-31h64v-32h43v-29h28v-31h12v-35h-4v-55h4v55h12v39h-12v34h-28v28h-40v35h-63v32h-97v30H477v36H264v32H0z" />
    <g transform="translate(777 405)">
      <path fill="#7c955d" opacity=".3" d="M-10 111h186v17H-10z" />
      <path fill="#e3c68e" d="M0 17h144v98H0z" /><path fill="#f0daa6" d="M0 17h101v98H0z" />
      <path fill="#b86246" d="M-15 18v-13h15V-9h17v-14h85v14h17V5h16v13h19v15H-15z" />
      <path fill="#d18558" d="M-15 18H0V5h17V-9h85v14H17v13H0v15h-15z" />
      <path fill="#824b39" d="M-15 30h169v9H-15z" /><path fill="#cb9b66" d="M102 40h42v75h-42z" />
      <path fill="#7d6444" d="M50 67h28v48H50z" /><path fill="#9b7a4d" d="M55 72h17v43H55z" /><path fill="#e5c28a" d="M67 91h4v4h-4z" />
      <path fill="#6a7c63" d="M12 56h26v28H12zm94 0h25v28h-25z" /><path fill="#b8d0b2" d="M16 60h18v20H16zm94 0h17v20h-17z" /><path fill="#f0daa6" d="M24 60h3v20h-3zm94 0h3v20h-3z" />
      <path fill="#8f8f59" d="M9 84h32v6H9zm94 0h31v6h-31z" /><path fill="#ae674c" d="M9 90h32v6H9zm94 0h31v6h-31z" />
      <path fill="#817150" d="M50 115h31v7H50z" /><path fill="#887251" d="M110-27h16V5h-16z" /><path fill="#ede5c9" opacity=".6" d="M111-45h10v9h-10zm9-20h13v11h-13z" />
    </g>
    <g transform="translate(146 434)">
      <path fill="#cebc88" d="M0 18h87v70H0z" /><path fill="#f1ddb0" d="M0 18h58v70H0z" /><path fill="#6b8260" d="M-12 19V7H0V-6h15v-14h38v14h15V7h14v12h16v13H-12z" /><path fill="#8c9b69" d="M0 7h15V-6h38V7H15v12H0z" /><path fill="#8f704d" d="M27 48h24v40H27z" /><path fill="#a8b99b" d="M64 46h14v18H64z" /><path fill="#e6d8ae" d="M68 46h3v18h-3z" />
    </g>
    <g fill="#c9bc84"><path d="M89 567h6v42h-6zm40 0h6v42h-6zm40 0h6v42h-6zm40 0h6v42h-6zm40 0h6v42h-6z" /><path d="M89 577h166v6H89zm0 18h166v6H89z" /></g>
    <g transform="translate(931 594)">
      <path fill="#769c84" d="M0 16h48V0h75v12h51v17h30v38h-26v20h-61v15H37V87H-11V68h-25V37H0z" />
      <path fill="#9eb9a0" d="M2 24h51V8h66v12h48v17h29v23h-25v19h-59v15H42V79H-4V61h-24V43H2z" />
      <path fill="#c2d0b1" d="M24 37h45v4H24zm89 20h48v4h-48zm-105 7h27v4H8zm55 15h26v4H63z" />
      <path fill="#789957" d="M113 25h22v6h-22zm-73 39h21v6H40z" /><path fill="#f3d1aa" d="M121 22h6v7h-6z" />
    </g>
    <Pine x={54} y={468} size={.85} /><Pine x={101} y={484} size={.64} /><Pine x={1129} y={486} size={.8} /><Pine x={1173} y={475} size={1.1} />
    <Tree x={301} y={509} size={.8} light /><Tree x={972} y={500} size={.8} light /><Tree x={1042} y={506} size={1.2} />
    <Pine x={34} y={625} size={1.5} /><Tree x={111} y={646} size={1.34} /><Tree x={5} y={718} size={1.6} light />
    <Pine x={1172} y={620} size={1.5} /><Tree x={1170} y={750} size={1.6} light />
    <g fill="#91a86b"><path d="M203 677h20v4h-20zm45-35h16v4h-16zm-61 77h20v4h-20zm731-170h14v4h-14zm-16 148h19v4h-19zm-51 51h18v4h-18zm-504-160h18v4h-18zm-58-58h15v4h-15zm404 5h18v4h-18zm343 258h20v4h-20z" /></g>
    <Flower x={183} y={651} /><Flower x={214} y={659} color="#e9b399" /><Flower x={167} y={678} /><Flower x={862} y={704} color="#e9b399" /><Flower x={880} y={722} /><Flower x={1092} y={579} /><Flower x={331} y={758} color="#e9b399" /><Flower x={356} y={741} /><Flower x={312} y={739} />
    <g transform="translate(258 554)"><path fill="#f2e5be" d="M0 2h17v4h8v13H0z" /><path fill="#e8d8ad" d="M2 18h5v7H2zm14 0h5v7h-5z" /><path fill="#b5a07e" d="M-4-4H8v12H-4z" /><path fill="#6b6c4c" d="M-2-1h3v3h-3z" /></g>
    <g fill="#74885b"><path d="M706 349h4v4h4v4h-4v-4h-4zm8 4h4v-4h4v4h-4v4h-4zm-528-46h4v4h4v4h-4v-4h-4zm8 4h4v-4h4v4h-4v4h-4z" /></g>
  </svg>
}
