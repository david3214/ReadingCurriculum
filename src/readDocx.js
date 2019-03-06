let docx = require("./docx-parser-modded/index")
const fs = require("fs")
const glob = require('glob')

//This big and annoying parseText will take a string object will all the Lesson info and put return it in an object
function parseText(textArr){
  let slides= {}

  let lesson = {
    title: '',
    description: '',
    objectives: [],
    wordList: '',
    images: ''
  }

  let checkStudentActions = false
  let fillActions = false
  let fillTips = false
  let lessonDescription = false
  let learningObjectives = false
  let lookingForLessenNumber = false
  let lookingForTips = false

  const resetValues = ()=>{
    checkStudentActions = false
    fillActions = false
    fillTips = false
    learningObjectives = false
    lessonDescription = false
  }
  let slideNum = 0

  textArr.forEach(text=>{
    if(text === '\n' || text === '' || text === ' '){
      if(fillActions = true)
        lookingForTips = true
      resetValues()
      return
    }
    if(lesson.title == '' && text.toLowerCase().includes('title:')){
      lesson.title = text.substring(7) //the position after ": " in title
      lookingForLessenNumber = true
      return
    }
    if(lookingForLessenNumber){
      if(text.toLowerCase().includes('t')){
        let numbers = text.match(/\d+/g).map(Number);
        lesson.track = numbers[0]
        lesson.unit = numbers[1]
        lesson.lesson = numbers[2]
        lookingForLessenNumber = false
      }
    }
    if(text.toLowerCase().includes('student learning objectives:')){
      learningObjectives = true
      lessonDescription = false
      return
    }
    if(learningObjectives){
      if(!text.toLowerCase().includes('at completion of this lesson,'))
        lesson.objectives.push(text)
      return
    }
    if(lessonDescription)
      lesson.description += text
    if(text.toLowerCase().includes('images:')){
      lesson.images = text.substring(8)
    }if(text.toLowerCase().includes('word list:'))
      lesson.wordList += text.substring(11)
    if(text.toLowerCase().includes('lesson description text:')){
      lessonDescription = true
      return
    }
    if(checkStudentActions){
      if(text.toLowerCase().includes(`student actions/output`)){
        fillActions = true
        checkStudentActions = false
        return
      } else if(text.toLowerCase().includes('show and tell')){
        slides[slideNum].showNtell = true
        return
      } else if(text.toLowerCase().includes('word wall'))
        slides[slideNum].wordWall = true
      else if(text.toLowerCase().includes('images: '))
        slides[slideNum].images = text.substring(8)
      else if(text.toLowerCase().includes('text:'))
        return
      else
        slides[slideNum].description = text
      return
      
    }
    if(fillActions){
      if(text.toLowerCase().includes(`teaching tips`)){
        resetValues()
        fillTips = true
      } else{
        slides[slideNum].actions.push(text)
        actionText = text
      }
      return
    }
    if(lookingForTips && text.toLowerCase().includes(`teaching tips`)){
      fillTips = true
      lookingForTips = false
      return
    }
    if(fillTips){
      slides[slideNum].tips.push(text)
    }
    if (text.toLowerCase().includes(`slide`)){
      if(hasNumber(text)) {
        slideNum = ~~text.match(/\d+/g).find(Number)
        slides[slideNum] = {
          actions: [],
          tips: []
        }
        slides[slideNum].name = `Slide ${slideNum}`
        checkStudentActions = true
      }
      if(text.toLowerCase().includes('show and tell')){
        slideNum++
        slides[slideNum] = {
          actions: [],
          tips: []
        }
        slides[slideNum].name = `Slide ${slideNum}`
        slides[slideNum].showNtell = true
        checkStudentActions = true
      }else if(text.toLowerCase().includes('word wall')){
        slideNum++
        slides[slideNum] = {
          actions: [],
          tips: []
        }
        slides[slideNum].name = `Slide ${slideNum}`
        slides[slideNum].wordWall = true
        checkStudentActions = true
      }
    }
    else if(text.toLowerCase().includes('show and tell')){
      slideNum++
      slides[slideNum] = {
        actions: [],
        tips: []
      }
      slides[slideNum].name = `Slide ${slideNum}`
      slides[slideNum].showNtell = true
      checkStudentActions = true
    }else if(text.toLowerCase().includes('word wall')){
      slideNum++
      slides[slideNum] = {
        actions: [],
        tips: []
      }
      slides[slideNum].name = `Slide ${slideNum}`
      slides[slideNum].wordWall = true
      checkStudentActions = true
    }
  })
  lesson.slides = slides
  return lesson
}

//Simple function for checking if the slide has a number in it
function hasNumber(myString) {
  return /\d/.test(myString);
}

//This is putting it all together, reading all the files getting the object form of the files.
function readAllDocx(desiredPath){
  glob("./src/documents/**/*.docx", {}, (err, files)=>{
    // console.log(files)
    files.forEach(file=>{

      let filePath = file.split('/')
      let filename = filePath.pop()
      filename = filename.substring(0, filename.length - 5)

      ;(function(f, d, file2){
        docx.parseDocx(file2, function(data){
          const strings = data.split('\n')
      
          const parsedText = parseText(strings)
          if(parsedText.track === 1)
            d += "track1/"
          else if(parsedText.track === 2)
            d += "track2/"
          else if(parsedText.track === 3)
            d += "track3/"
          // console.log(parsedText)
          fs.writeFile(`${d + f}.json`, JSON.stringify(parsedText), err=>{
            if(err) throw err
          })
        })
      })(filename,desiredPath, file)
    })
  })
}

// docx.parseDocx('./src/documents/T1U1L1 Directions.docx', (data)=>{
//   const strings = data.split('\n')
  
//   let parsedText = parseText(strings)
//   fs.writeFile(`Test.json`, JSON.stringify(parsedText), err=>{
//     if(err) throw err
//   })
// })

readAllDocx('./src/documents/json-files/')
