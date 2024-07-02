
export function followQuery(follow: boolean) {
  return `
    const data = []
    const follow = ${follow ? 'true' : 'false'}
    const rotated = /_\\d+\\.txt$/
    Array.from(xdmp.hosts()).forEach(host => {
      const directory = xdmp.dataDirectory(host) + '/Logs/';
      const files = xdmp.filesystemDirectory(directory)
          .filter(file => file.contentLength)
          .filter(file => follow ? !rotated.test(file.filename) : true)
          .map(x => {
            // send only what client needs
            const obj = {
              host,
              filename: x.filename,
              cursor: x.contentLength,
            }
            return obj
          })
        JSON.stringify(files)
      files.forEach(f => data.push(f))
    })
    JSON.stringify(data)
  `;
}


export function changeDataQuery({
  host, filename, cursor,
}) {
  return `
    const directory = xdmp.dataDirectory("${host}") + '/Logs/';
    const name = xdmp.hostName("${host}")
    xdmp.filesystemFile("file://" + name + "/" + directory + "/${filename}").toString().substring(${cursor})
  `
    // xdmp.externalBinary("file://" + name + "/" + directory + "/${filename}", ${cursor + 1}, ${size}).toString()
}

export function freshLogFile({
  host, filename
}) {
  return `
    const directory = xdmp.dataDirectory("${host}") + '/Logs/';
    const name = xdmp.hostName("${host}")
    xdmp.filesystemFile("file://" + name + "/" + directory + "/${filename}").toString()
  `
// xdmp.externalBinary("file://" + name + "/" + directory + "/${filename}").toString()
}
