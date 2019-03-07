import fs from 'fs'
import glob from 'glob'
import {createProvider} from './vue-apollo.js'
import gql from 'graphql-tag'

const apollo = createProvider().defaultClient

glob("./src/documents/json-files/track1/*.json", {}, async(err, files)=>{
  const {data: {login: {token}}} = await apollo.mutate({
    mutation: gql`
    mutation login($cred: Credentials!){
      login(input: $cred){
        token
        success
      }
    }
    `, variables: {
      cred: {
        tenantId: 1006,
        username: process.env.USERNAME || "naativ.test.interviewer@mailinator.com",
        password: process.env.PASSWORD || "Password1"
      }
    }
  })
  // console.log(token)
  const authedApollo = createProvider({getAuth: ()=>`Bearer ${token}`}).defaultClient
  
  let blockIds = await  allUnits(authedApollo)
  for(let filesIndex = 0; filesIndex < files.length; ++filesIndex){
  // files.forEach(file=>{
    await fs.readFile(files[filesIndex], async(err,data)=>{

      if (err) throw err
      let lessonObj = JSON.parse(data)
      const {title, description, wordList,
        objectives, lesson, slides, track, unit} = lessonObj

      if(!unit)
        return

      const objectiveOpener = "<div> At completion of this lesson, students will be able to: </div>"
      let objectiveList = objectives.reduce((prev, cur)=>{
        return prev + " <li>" + cur + "</li>"
      }, "")
      objectiveList = " <div> <ul>" + objectiveList + "</ul></div>"

      const metadata = JSON.stringify({
        wordList,
        objectives: objectiveOpener + objectiveList
      })

      let lessonKey = `english:`
      if(track == 1)
        lessonKey += `beginner:`
      else if (track == 2)
        lessonKey += `intermediate:`
      else
        lessonKey += `advanced:`
      lessonKey += `lesson${lesson}`
    

      console.log("Block Id: ", blockIds[track - 1][unit - 1])
      console.log("Track: ", track)
      console.log("unit: ", unit)

      const lessonUpsert = await authedApollo.mutate({
        mutation: gql`
        mutation upsertLesson($input: UpsertLessonInput){
          upsertLesson(input: $input){
            id
            name
            key
            description
          }
        }
        `, variables: {
          input: {
            name: title,
            key: `${lessonKey}`, // What should go here
            description: description,
            metadata: `${metadata}`,
            priority: 0,
            blockId: blockIds[track - 1][unit - 1]
          }
        }
      }).catch((err)=>console.log("Lesson Error: ", err.graphQLErrors, '\n', title))
      // console.log("Lesson!", track, lesson)
      const slideNums = Object.keys(slides)
      for(let i = 0; i < slideNums.length; ++i){
      // Object.keys(slides).forEach(async(slideNum)=>{
        let slideMeta = {}
        if(slides[slideNums[i]].actions)
          slideMeta.actions = slides[slideNums[i]].actions
        if(slides[slideNums[i]].tips)
          slideMeta.tips = slides[slideNums[i]].tips
        
        const slideMetadata = JSON.stringify(slideMeta)

        const slideUpsert = await authedApollo.mutate({
          mutation: gql`
            mutation upsertSlide($input: UpsertSlideInput){
              upsertSlide(input: $input){
                id
                name
                description
                metadata
              }
            }
          `, variables: {
            input: {
              name: slides[slideNums[i]].name,
              key: `${lessonKey}:slide${slideNums[i]}`,
              description: slides[slideNums[i]].description || "",
              priority: 0,
              lessonId: lessonUpsert ? lessonUpsert.data.upsertLesson.id : null,
              metadata: `${slideMetadata}`,
              typeId: 1
            }
          }
        }).catch((err)=>console.log(`Slide error on Slide ${slideNums[i]} in Lesson ${lesson}`) )
      }
    })
  }
})

async function upsertUnitAndBlock(apollo, unitInfo){
  const {track, unit} = unitInfo
  let unitInput = {priority: 0, description: `Unit ${unit}`}
  let blockInput = {priority: 0, description: `Block ${unit}`}
  if(track === 1){
    unitInput.key = `english:beginner:unit${unit}`
    unitInput.name = `Eng Beg - Unit ${unit}`
    unitInput.courseId = 1001
    blockInput.key = `english:beginner:block${unit}`
    blockInput.name = `Eng Beg - Block ${unit}`
  } else if (track === 2){
    unitInput.key = `english:intermediate:unit${unit}`
    unitInput.name = `Eng Int - Unit ${unit}`
    unitInput.courseId = 1002
    blockInput.key = `english:intermediate:block${unit}`
    blockInput.name = `Eng Int - Block ${unit}`
  } else{
    unitInput.key = `english:advanced:unit${unit}`
    unitInput.name = `Eng Adv - Unit ${unit}`
    unitInput.courseId = 1003
    blockInput.key = `english:advanced:block${unit}`
    blockInput.name = `Eng Adv - Block ${unit}`
  }
  await new Promise( resolve => setTimeout(resolve, 3 * 1000))

  const createdUnit = await apollo.mutate({
    mutation: gql`
      mutation upsertUnit($unitInput: UpsertUnitInput) {
        upsertUnit(input: $unitInput) {
          id
          name
          key
          courseId
        }
    }`, variables: {unitInput}
  })

  blockInput.unitId = createdUnit.data.upsertUnit.id

  await new Promise( resolve => setTimeout(resolve, 3 * 1000))

  const block = await apollo.mutate({
    mutation: gql`
      mutation upsertBlock($blockInput: UpsertBlockInput) {
        upsertBlock(input: $blockInput) {
          id
          name
          key
          description
          priority
          unitId
        }
      }`, variables: {blockInput}
  })
  return block.data.upsertBlock.id
}

async function allUnits(apollo){
  let inputs = []
  inputs.push({priority: 0, description: `Unit 1`, 
    key: `english:beginner:unit1`, name:  `Eng Beg - Unit 1`, courseId: 1001})
  inputs.push({priority: 0, description: `Block 1`, 
    key: `english:beginner:block1`, name: `Eng Beg - Block 1`})

  inputs.push({priority: 0, description: `Unit 2`, 
    key: `english:beginner:unit2`, name:  `Eng Beg - Unit 2`, courseId: 1001})
  inputs.push({priority: 0, description: `Block 2`, 
    key: `english:beginner:block2`, name: `Eng Beg - Block 2`})

  inputs.push({priority: 0, description: `Unit 3`, 
    key: `english:beginner:unit3`, name:  `Eng Beg - Unit 3`, courseId: 1001})
  inputs.push({priority: 0, description: `Block 3`, 
    key: `english:beginner:block3`, name: `Eng Beg - Block 3`})

  inputs.push({priority: 0, description: `Unit 4`, 
    key: `english:beginner:unit4`, name:  `Eng Beg - Unit 4`, courseId: 1001})
  inputs.push({priority: 0, description: `Block 4`, 
    key: `english:beginner:block4`, name: `Eng Beg - Block 4`})

  inputs.push({priority: 0, description: `Unit 1`, 
    key: `english:intermediate:unit1`, name:  `Eng Int - Unit 1`, courseId: 1002})
  inputs.push({priority: 0, description: `Block 1`, 
    key: `english:intermediate:block1`, name: `Eng Int - Block 1`})

  inputs.push({priority: 0, description: `Unit 2`, 
    key: `english:intermediate:unit2`, name:  `Eng Int - Unit 2`, courseId: 1002})
  inputs.push({priority: 0, description: `Block 2`, 
    key: `english:intermediate:block2`, name: `Eng Int - Block 2`})

  inputs.push({priority: 0, description: `Unit 3`, 
    key: `english:intermediate:unit3`, name:  `Eng Int - Unit 3`, courseId: 1002})
  inputs.push({priority: 0, description: `Block 3`, 
    key: `english:intermediate:block3`, name: `Eng Int - Block 3`})

  inputs.push({priority: 0, description: `Unit 4`, 
    key: `english:intermediate:unit4`, name:  `Eng Int - Unit 4`, courseId: 1002})
  inputs.push({priority: 0, description: `Block 4`, 
    key: `english:intermediate:block4`, name: `Eng Int - Block 4`})

  inputs.push({priority: 0, description: `Unit 4`, 
    key: `english:beginner:unit4`, name:  `Eng Int - Unit 4`, courseId: 1002})
  inputs.push({priority: 0, description: `Block 4`, 
    key: `english:beginner:block4`, name: `Eng Int - Block 4`})

  inputs.push({priority: 0, description: `Unit 1`, 
    key: `english:advanced:unit1`, name:  `Eng Adv - Unit 1`, courseId: 1003})
  inputs.push({priority: 0, description: `Block 1`, 
    key: `english:advanced:block1`, name: `Eng Adv - Block 1`})

  inputs.push({priority: 0, description: `Unit 2`, 
    key: `english:advanced:unit2`, name:  `Eng Adv - Unit 2`, courseId: 1003})
  inputs.push({priority: 0, description: `Block 2`, 
    key: `english:advanced:block2`, name: `Eng Adv - Block 2`})

  inputs.push({priority: 0, description: `Unit 3`, 
    key: `english:advanced:unit3`, name:  `Eng Adv - Unit 3`, courseId: 1003})
  inputs.push({priority: 0, description: `Block 3`, 
    key: `english:advanced:block3`, name: `Eng Adv - Block 3`})

  inputs.push({priority: 0, description: `Unit 4`, 
    key: `english:advanced:unit4`, name:  `Eng Adv - Unit 4`, courseId: 1003})
  inputs.push({priority: 0, description: `Block 4`, 
    key: `english:advanced:block4`, name: `Eng Adv - Block 4`})
  let blockIds = [[],[],[]]
  for(let i = 0; i < inputs.length; ++i){
    if(inputs[i].courseId){

      const createdUnit = await apollo.mutate({
        mutation: gql`
          mutation upsertUnit($unitInput: UpsertUnitInput) {
            upsertUnit(input: $unitInput) {
              id
              name
              key
              courseId
            }
        }`, variables: {unitInput: inputs[i]}
      })
    
      inputs[i + 1].unitId = createdUnit.data.upsertUnit.id
    } else{

      const block = await apollo.mutate({
        mutation: gql`
          mutation upsertBlock($blockInput: UpsertBlockInput) {
            upsertBlock(input: $blockInput) {
              id
              name
              key
              description
              priority
              unitId
            }
          }`, variables: {blockInput: inputs[i]}
      })
      if(inputs[i].name.includes('Beg'))
        blockIds[0].push(block.data.upsertBlock.id)
      else if(inputs[i].name.includes('Int'))
        blockIds[1].push(block.data.upsertBlock.id)
      else
        blockIds[2].push(block.data.upsertBlock.id)
    }
  }
  return blockIds
}